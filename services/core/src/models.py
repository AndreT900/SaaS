from datetime import datetime
from typing import Optional, Literal, List
from enum import Enum
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from typing_extensions import Annotated

# Helper for ObjectId
PyObjectId = Annotated[str, BeforeValidator(str)]

class PlanType(str, Enum):
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class ApiKeyMode(str, Enum):
    MANAGED = "managed"
    CLIENT_OWNED = "client_owned"

class Company(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    responsible_email: EmailStr
    status: Literal["pending", "active", "suspended"] = "pending"
    activation_token: Optional[str] = None
    api_key_mode: ApiKeyMode = ApiKeyMode.MANAGED
    encrypted_api_key: Optional[str] = None
    plan: PlanType = PlanType.BASIC
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: Optional[str] = None
    email: EmailStr
    password_hash: str
    role: Literal["superadmin", "company_admin", "employee"]
    company_id: str
    job_title: Optional[str] = None
    allowed_tools: List[str] = []

    class Config:
        populate_by_name = True

# --- Microservices Models ---

class Chat(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    participants: List[str] # user_ids
    status: Literal["active", "archived", "pending_close"] = "active"
    close_approvals: List[str] = [] # list of user_ids who approved closure
    parent_chat_id: Optional[str] = None
    origin_message_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

class Meeting(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    date: datetime
    participants: List[str]
    files: List[str] = [] # file URLs
    embedding_ids: List[str] = []
    company_id: str

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

class CalendarEvent(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    date: datetime
    user_id: str
    company_id: str
    type: Literal["ferie", "permesso"]
    status: Literal["approved", "pending_admin"] = "approved"

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

# Request Models
class CreateCompanyRequest(BaseModel):
    name: str
    email: EmailStr
    mode: ApiKeyMode = ApiKeyMode.MANAGED
    api_key: Optional[str] = None

class SetupRequest(BaseModel):
    token: str
    password: str
    confirm_password: str

class CreateUserRequest(BaseModel):
    name: str = "Employee"
    email: Optional[EmailStr] = None # Optional, will be generated if missing
    password: str
    role: Literal["company_admin", "employee"] = "employee"
    job_title: Optional[str] = None
    allowed_tools: Optional[List[str]] = None # Services the user can access

class UpdateUserRequest(BaseModel):
    allowed_tools: Optional[List[str]] = None
    password: Optional[str] = None
