import os
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
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
meetings_col = db["meetings"]

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

def require_meetings_access(current_user: dict = Depends(get_current_user)):
    """Verify the user has access to the meetings service."""
    if current_user["role"] in ["superadmin", "company_admin"]:
        return current_user
    if "meetings" not in current_user.get("allowed_tools", []):
        raise HTTPException(status_code=403, detail="No access to meetings service")
    return current_user

# --- Models ---
class CreateMeetingRequest(BaseModel):
    title: str
    date: str  # ISO date string
    participant_emails: List[str]
    notes: Optional[str] = None

class AddNotesRequest(BaseModel):
    notes: str

# --- Endpoints ---

@app.get("/health")
def health_check():
    try:
        client.admin.command("ping")
        return {"status": "ok", "service": "meetings", "db": "connected"}
    except Exception:
        return {"status": "error", "service": "meetings", "db": "disconnected"}

@app.post("/meetings")
def create_meeting(
    request: CreateMeetingRequest,
    user: dict = Depends(require_meetings_access)
):
    """Create a new meeting record."""
    all_participants = list(set([user["email"]] + request.participant_emails))

    meeting_doc = {
        "_id": secrets.token_hex(12),
        "title": request.title,
        "date": request.date,
        "participants": all_participants,
        "notes": request.notes or "",
        "files": [],
        "company_id": user["company_id"],
        "created_by": user["email"],
        "created_at": datetime.now(timezone.utc)
    }
    meetings_col.insert_one(meeting_doc)
    return {
        "id": meeting_doc["_id"],
        "title": meeting_doc["title"],
        "status": "created"
    }

@app.get("/meetings")
def list_meetings(user: dict = Depends(require_meetings_access)):
    """List all meetings for the company."""
    query = {
        "company_id": user["company_id"],
        "participants": user["email"]
    }
    # Admins see all company meetings
    if user["role"] in ["company_admin", "superadmin"]:
        query = {"company_id": user["company_id"]}

    meetings = list(meetings_col.find(query).sort("date", -1))
    return [
        {
            "id": m["_id"],
            "title": m["title"],
            "date": m["date"],
            "participants": m["participants"],
            "file_count": len(m.get("files", [])),
            "created_at": m["created_at"].isoformat() if m.get("created_at") else None
        }
        for m in meetings
    ]

@app.get("/meetings/{meeting_id}")
def get_meeting(meeting_id: str, user: dict = Depends(require_meetings_access)):
    """Get detailed meeting info."""
    meeting = meetings_col.find_one({"_id": meeting_id, "company_id": user["company_id"]})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    return {
        "id": meeting["_id"],
        "title": meeting["title"],
        "date": meeting["date"],
        "participants": meeting["participants"],
        "notes": meeting.get("notes", ""),
        "files": meeting.get("files", []),
        "created_by": meeting["created_by"],
        "created_at": meeting["created_at"].isoformat() if meeting.get("created_at") else None
    }

@app.put("/meetings/{meeting_id}/notes")
def update_notes(
    meeting_id: str,
    request: AddNotesRequest,
    user: dict = Depends(require_meetings_access)
):
    """Add or update meeting notes."""
    meeting = meetings_col.find_one({"_id": meeting_id, "company_id": user["company_id"]})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meetings_col.update_one(
        {"_id": meeting_id},
        {"$set": {"notes": request.notes}}
    )
    return {"id": meeting_id, "status": "notes_updated"}

@app.post("/meetings/{meeting_id}/upload")
async def upload_file(
    meeting_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_meetings_access)
):
    """Upload a file reference to a meeting."""
    meeting = meetings_col.find_one({"_id": meeting_id, "company_id": user["company_id"]})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Store file metadata (actual file storage would use S3/GridFS in production)
    file_entry = {
        "id": secrets.token_hex(8),
        "filename": file.filename,
        "content_type": file.content_type,
        "size": file.size,
        "uploaded_by": user["email"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    meetings_col.update_one(
        {"_id": meeting_id},
        {"$push": {"files": file_entry}}
    )
    return {"filename": file.filename, "status": "uploaded"}

@app.delete("/meetings/{meeting_id}")
def delete_meeting(meeting_id: str, user: dict = Depends(require_meetings_access)):
    """Delete a meeting (admin or creator only)."""
    meeting = meetings_col.find_one({"_id": meeting_id, "company_id": user["company_id"]})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting["created_by"] != user["email"] and user["role"] not in ["company_admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only the creator or admin can delete")

    meetings_col.delete_one({"_id": meeting_id})
    return {"id": meeting_id, "status": "deleted"}
