import os
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends
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
documents_col = db["documents"]

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

def require_documents_access(current_user: dict = Depends(get_current_user)):
    """Verify the user has access to the documents service."""
    if current_user["role"] in ["superadmin", "company_admin"]:
        return current_user
    if "documents" not in current_user.get("allowed_tools", []):
        raise HTTPException(status_code=403, detail="No access to documents service")
    return current_user

# --- Models ---
class CreateDocumentRequest(BaseModel):
    title: str
    content: str
    tags: Optional[List[str]] = None

class UpdateDocumentRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class AskDocumentRequest(BaseModel):
    question: str
    document_id: Optional[str] = None  # If None, search across all docs

# --- Endpoints ---

@app.get("/health")
def health_check():
    try:
        client.admin.command("ping")
        return {"status": "ok", "service": "documents", "db": "connected"}
    except Exception:
        return {"status": "error", "service": "documents", "db": "disconnected"}

@app.post("/documents")
def create_document(
    request: CreateDocumentRequest,
    user: dict = Depends(require_documents_access)
):
    """Create a new document in the company space."""
    doc = {
        "_id": secrets.token_hex(12),
        "title": request.title,
        "content": request.content,
        "tags": request.tags or [],
        "company_id": user["company_id"],
        "uploaded_by": user["email"],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    documents_col.insert_one(doc)
    return {
        "id": doc["_id"],
        "title": doc["title"],
        "status": "created"
    }

@app.get("/documents")
def list_documents(
    tag: Optional[str] = None,
    user: dict = Depends(require_documents_access)
):
    """List all documents in the company."""
    query = {"company_id": user["company_id"]}
    if tag:
        query["tags"] = tag

    docs = list(documents_col.find(query).sort("created_at", -1))
    return [
        {
            "id": d["_id"],
            "title": d["title"],
            "tags": d.get("tags", []),
            "uploaded_by": d["uploaded_by"],
            "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
            "size": len(d.get("content", ""))
        }
        for d in docs
    ]

@app.get("/documents/{doc_id}")
def get_document(doc_id: str, user: dict = Depends(require_documents_access)):
    """Get a single document with full content."""
    doc = documents_col.find_one({"_id": doc_id, "company_id": user["company_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": doc["_id"],
        "title": doc["title"],
        "content": doc["content"],
        "tags": doc.get("tags", []),
        "uploaded_by": doc["uploaded_by"],
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        "updated_at": doc["updated_at"].isoformat() if doc.get("updated_at") else None
    }

@app.put("/documents/{doc_id}")
def update_document(
    doc_id: str,
    request: UpdateDocumentRequest,
    user: dict = Depends(require_documents_access)
):
    """Update a document."""
    doc = documents_col.find_one({"_id": doc_id, "company_id": user["company_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if request.title is not None:
        update_fields["title"] = request.title
    if request.content is not None:
        update_fields["content"] = request.content
    if request.tags is not None:
        update_fields["tags"] = request.tags

    documents_col.update_one({"_id": doc_id}, {"$set": update_fields})
    return {"id": doc_id, "status": "updated"}

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str, user: dict = Depends(require_documents_access)):
    """Delete a document."""
    doc = documents_col.find_one({"_id": doc_id, "company_id": user["company_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Only the uploader or an admin can delete
    if doc["uploaded_by"] != user["email"] and user["role"] not in ["company_admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only the uploader or admin can delete")

    documents_col.delete_one({"_id": doc_id})
    return {"id": doc_id, "status": "deleted"}
