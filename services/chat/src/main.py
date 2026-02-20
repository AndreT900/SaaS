import os
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from pymongo import MongoClient
from jose import JWTError, jwt

# --- Config ---
MONGO_URI = os.getenv("MONGO_URI")
SECRET_KEY = os.getenv("SECRET_KEY", "supersearch_jwt_secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# --- App ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database ---
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client["multitool"]
chats_col = db["chats"]
messages_col = db["messages"]

# --- Auth ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8000/auth/token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(status_code=401, detail="Invalid credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        company_id = payload.get("company_id")
        role = payload.get("role")
        allowed_tools = payload.get("allowed_tools", [])
        if not email or not company_id:
            raise credentials_exception
        return {
            "email": email,
            "company_id": company_id,
            "role": role,
            "allowed_tools": allowed_tools
        }
    except JWTError:
        raise credentials_exception

def require_chat_access(current_user: dict = Depends(get_current_user)):
    """Verify the user has access to the chat service."""
    if current_user["role"] in ["superadmin", "company_admin"]:
        return current_user
    if "chat" not in current_user.get("allowed_tools", []):
        raise HTTPException(status_code=403, detail="No access to chat service")
    return current_user

# --- Models ---
class CreateChatRequest(BaseModel):
    title: str
    participant_emails: List[str]  # Emails of participants to add

class SendMessageRequest(BaseModel):
    text: str

class CloseRequest(BaseModel):
    chat_id: str

# --- Endpoints ---

@app.get("/health")
def health_check():
    try:
        client.admin.command("ping")
        return {"status": "ok", "service": "chat", "db": "connected"}
    except Exception:
        return {"status": "error", "service": "chat", "db": "disconnected"}

@app.post("/chats")
def create_chat(
    request: CreateChatRequest,
    user: dict = Depends(require_chat_access)
):
    """Create a new chat room within the company."""
    # Include the creator in participants
    all_participants = list(set([user["email"]] + request.participant_emails))

    chat_doc = {
        "_id": secrets.token_hex(12),
        "title": request.title,
        "company_id": user["company_id"],
        "participants": all_participants,
        "status": "active",
        "close_approvals": [],
        "created_by": user["email"],
        "created_at": datetime.now(timezone.utc)
    }
    chats_col.insert_one(chat_doc)
    return {"id": chat_doc["_id"], "title": chat_doc["title"], "status": "created"}

@app.get("/chats")
def get_chats(user: dict = Depends(require_chat_access)):
    """Get all chats the user participates in."""
    query = {
        "company_id": user["company_id"],
        "participants": user["email"]
    }
    chats = list(chats_col.find(query).sort("created_at", -1))
    
    result = []
    for c in chats:
        # Get last message preview
        last_msg = messages_col.find_one(
            {"chat_id": c["_id"]},
            sort=[("created_at", -1)]
        )
        result.append({
            "id": c["_id"],
            "title": c["title"],
            "status": c["status"],
            "participants": c["participants"],
            "last_message": last_msg["text"][:50] if last_msg else None,
            "created_at": c["created_at"].isoformat() if c.get("created_at") else None
        })
    return result

@app.get("/chats/{chat_id}/messages")
def get_messages(chat_id: str, user: dict = Depends(require_chat_access)):
    """Get all messages in a chat."""
    chat = chats_col.find_one({"_id": chat_id, "company_id": user["company_id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if user["email"] not in chat["participants"]:
        raise HTTPException(status_code=403, detail="Not a participant of this chat")

    msgs = list(messages_col.find({"chat_id": chat_id}).sort("created_at", 1))
    return [
        {
            "id": m["_id"],
            "text": m["text"],
            "sender": m["sender"],
            "created_at": m["created_at"].isoformat() if m.get("created_at") else None
        }
        for m in msgs
    ]

@app.post("/chats/{chat_id}/messages")
def send_message(
    chat_id: str,
    request: SendMessageRequest,
    user: dict = Depends(require_chat_access)
):
    """Send a message to a chat."""
    chat = chats_col.find_one({"_id": chat_id, "company_id": user["company_id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if user["email"] not in chat["participants"]:
        raise HTTPException(status_code=403, detail="Not a participant of this chat")
    if chat["status"] == "archived":
        raise HTTPException(status_code=400, detail="Chat is archived")

    msg_doc = {
        "_id": secrets.token_hex(12),
        "chat_id": chat_id,
        "text": request.text,
        "sender": user["email"],
        "created_at": datetime.now(timezone.utc)
    }
    messages_col.insert_one(msg_doc)
    return {
        "id": msg_doc["_id"],
        "text": msg_doc["text"],
        "sender": msg_doc["sender"],
        "created_at": msg_doc["created_at"].isoformat()
    }

@app.post("/chats/{chat_id}/close")
def request_close(chat_id: str, user: dict = Depends(require_chat_access)):
    """Request consensus-based chat closure."""
    chat = chats_col.find_one({"_id": chat_id, "company_id": user["company_id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if user["email"] not in chat["participants"]:
        raise HTTPException(status_code=403, detail="Not a participant of this chat")
    if chat["status"] == "archived":
        return {"status": "already_archived"}

    approvals = chat.get("close_approvals", [])
    if user["email"] not in approvals:
        approvals.append(user["email"])

    # Archive if all participants approved
    new_status = "archived" if len(approvals) == len(chat["participants"]) else "pending_close"
    
    chats_col.update_one(
        {"_id": chat_id},
        {"$set": {"close_approvals": approvals, "status": new_status}}
    )

    return {
        "status": new_status,
        "approvals": len(approvals),
        "required": len(chat["participants"])
    }
