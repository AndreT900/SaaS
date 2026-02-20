import os
import secrets
from datetime import date as date_type, datetime, timezone
from typing import Literal, List, Optional

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
leaves_col = db["leaves"]

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

def require_calendar_access(current_user: dict = Depends(get_current_user)):
    """Verify the user has access to the calendar service."""
    if current_user["role"] in ["superadmin", "company_admin"]:
        return current_user
    if "calendar" not in current_user.get("allowed_tools", []):
        raise HTTPException(status_code=403, detail="No access to calendar service")
    return current_user

# --- Models ---
class LeaveRequest(BaseModel):
    date: date_type
    type: Literal["ferie", "permesso"]

# --- Endpoints ---

@app.get("/health")
def health_check():
    try:
        client.admin.command("ping")
        return {"status": "ok", "service": "calendar", "db": "connected"}
    except Exception:
        return {"status": "error", "service": "calendar", "db": "disconnected"}

@app.post("/leaves")
def request_leave(
    request: LeaveRequest,
    user: dict = Depends(require_calendar_access)
):
    """Request a new leave day."""
    # Check for duplicate request on same date
    existing = leaves_col.find_one({
        "user_email": user["email"],
        "company_id": user["company_id"],
        "date": request.date.isoformat()
    })
    if existing:
        raise HTTPException(status_code=400, detail="Leave already requested for this date")

    leave_doc = {
        "_id": secrets.token_hex(12),
        "user_email": user["email"],
        "company_id": user["company_id"],
        "date": request.date.isoformat(),
        "type": request.type,
        "status": "approved",  # Auto-approve for now
        "created_at": datetime.now(timezone.utc)
    }
    leaves_col.insert_one(leave_doc)
    return {
        "id": leave_doc["_id"],
        "date": leave_doc["date"],
        "type": leave_doc["type"],
        "status": leave_doc["status"]
    }

@app.get("/leaves")
def get_my_leaves(user: dict = Depends(require_calendar_access)):
    """Get all leaves for the current user."""
    query = {"user_email": user["email"], "company_id": user["company_id"]}
    leaves = list(leaves_col.find(query).sort("date", -1))
    return [
        {
            "id": l["_id"],
            "date": l["date"],
            "type": l["type"],
            "status": l["status"]
        }
        for l in leaves
    ]

@app.delete("/leaves/{leave_id}")
def cancel_leave(leave_id: str, user: dict = Depends(require_calendar_access)):
    """Cancel a pending/approved leave."""
    leave = leaves_col.find_one({"_id": leave_id, "user_email": user["email"]})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    
    leaves_col.delete_one({"_id": leave_id})
    return {"status": "cancelled"}

@app.get("/leaves/company")
def get_company_leaves(
    date: Optional[date_type] = None,
    user: dict = Depends(require_calendar_access)
):
    """Get all leaves for the company (admin view)."""
    if user["role"] not in ["company_admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {"company_id": user["company_id"]}
    if date:
        query["date"] = date.isoformat()
    
    leaves = list(leaves_col.find(query).sort("date", -1))
    return [
        {
            "id": l["_id"],
            "user_email": l["user_email"],
            "date": l["date"],
            "type": l["type"],
            "status": l["status"]
        }
        for l in leaves
    ]
