import secrets
from datetime import timedelta

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo.collection import Collection

from .database import get_db_client
from .config import settings
from .models import (
    Company,
    User,
    ApiKeyMode,
    PlanType,
    CreateCompanyRequest,
    SetupRequest,
    CreateUserRequest,
    UpdateUserRequest
)
from .auth import (
    get_password_hash,
    create_access_token,
    verify_password,
    get_current_user
)

# All available services in the platform
ALL_SERVICES = ["chat", "calendar", "documents", "meetings"]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependencies ---

def get_db():
    client = get_db_client()
    if not client:
        raise HTTPException(status_code=500, detail="Database connection error")
    return client

def get_companies_collection(client=Depends(get_db)) -> Collection:
    return client["multitool"]["companies"]

def get_users_collection(client=Depends(get_db)) -> Collection:
    return client["multitool"]["users"]

# --- Health Check ---

@app.get("/health")
def health_check():
    client = get_db_client()
    if client:
        try:
             client.admin.command('ping')
             return {"status": "ok", "db": "connected"}
        except Exception:
             return {"status": "error", "db": "disconnected"}
    return {"status": "error", "db": "disconnected"}

# --- Superadmin Endpoints ---

@app.post("/superadmin/companies")
def create_company(
    request: CreateCompanyRequest,
    current_user: dict = Depends(get_current_user),
    companies: Collection = Depends(get_companies_collection)
):
    if current_user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized as Superadmin")

    if companies.find_one({"responsible_email": request.email}):
        raise HTTPException(status_code=400, detail="Company with this email already exists")

    activation_token = secrets.token_urlsafe(32)
    
    encrypted_key = None
    if request.mode == ApiKeyMode.MANAGED and request.api_key:
        encrypted_key = request.api_key  # Should be encrypted in production

    new_company = Company(
        _id=secrets.token_hex(12),
        name=request.name,
        responsible_email=request.email,
        status="pending",
        activation_token=activation_token,
        api_key_mode=request.mode,
        encrypted_api_key=encrypted_key,
        plan=PlanType.BASIC
    )

    companies.insert_one(new_company.model_dump(by_alias=True))

    activation_link = f"http://localhost:5173/setup?token={activation_token}"
    return {"activation_link": activation_link}

@app.get("/superadmin/dashboard")
def superadmin_dashboard(
    current_user: dict = Depends(get_current_user),
    companies_col: Collection = Depends(get_companies_collection),
    users_col: Collection = Depends(get_users_collection)
):
    if current_user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized as Superadmin")

    companies = list(companies_col.find())
    result = []
    for company_doc in companies:
        company_id = company_doc["_id"]
        user_count = users_col.count_documents({"company_id": company_id})
        
        result.append({
            "id": company_id,
            "name": company_doc.get("name"),
            "status": company_doc.get("status"),
            "plan": company_doc.get("plan"),
            "user_count": user_count,
            "created_at": company_doc.get("created_at")
        })
    return result

# --- Public Activation Endpoints ---

@app.get("/auth/check-token/{token}")
def check_token(
    token: str,
    companies: Collection = Depends(get_companies_collection)
):
    company = companies.find_one({"activation_token": token, "status": "pending"})
    if not company:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    
    return {
        "name": company["name"],
        "email": company["responsible_email"]
    }

@app.post("/auth/setup")
def setup_company(
    request: SetupRequest,
    companies: Collection = Depends(get_companies_collection),
    users: Collection = Depends(get_users_collection)
):
    company = companies.find_one({"activation_token": request.token, "status": "pending"})
    if not company:
        raise HTTPException(status_code=404, detail="Invalid or expired token")

    if request.password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    companies.update_one(
        {"_id": company["_id"]},
        {"$set": {"status": "active", "activation_token": None}}
    )

    hashed_password = get_password_hash(request.password)
    # Company admin gets access to all services
    new_user = User(
        _id=secrets.token_hex(12),
        email=company["responsible_email"],
        password_hash=hashed_password,
        role="company_admin",
        company_id=company["_id"],
        allowed_tools=ALL_SERVICES
    )

    if not users.find_one({"email": new_user.email}):
        users.insert_one(new_user.model_dump(by_alias=True))

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": new_user.email,
            "role": "company_admin",
            "company_id": company["_id"],
            "allowed_tools": ALL_SERVICES
        },
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

# --- Company Admin Endpoints ---

@app.get("/admin/users")
def get_company_users(
    current_user: dict = Depends(get_current_user),
    users_col: Collection = Depends(get_users_collection)
):
    if current_user["role"] != "company_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = list(users_col.find({"company_id": current_user["company_id"]}))
    
    return [
        {
            "id": u["_id"],
            "name": u.get("name", "N/A"),
            "email": u["email"],
            "role": u["role"],
            "job_title": u.get("job_title"),
            "allowed_tools": u.get("allowed_tools", []),
            "status": u.get("status", "active")
        }
        for u in users
    ]

@app.get("/users/directory")
def get_company_directory(
    current_user: dict = Depends(get_current_user),
    users_col: Collection = Depends(get_users_collection)
):
    users = list(users_col.find({"company_id": current_user["company_id"]}))
    return [
        {
            "id": u["_id"],
            "name": u.get("name", "N/A"),
            "email": u["email"],
            "job_title": u.get("job_title"),
            "role": u.get("role")
        }
        for u in users
    ]

@app.post("/admin/users")
def create_company_user(
    request: CreateUserRequest,
    current_user: dict = Depends(get_current_user),
    users_col: Collection = Depends(get_users_collection)
):
    if current_user["role"] != "company_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Auto-generate email from name if not provided
    if not request.email:
        clean_name = "".join(e for e in request.name if e.isalnum()).lower()
        request.email = f"{clean_name}@{current_user['company_id']}.com"

    if users_col.find_one({"email": request.email}):
         raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed_password = get_password_hash(request.password)
    
    # Company admins always get full access; employees get selected services
    if request.role == "company_admin":
        tools = ALL_SERVICES
    else:
        tools = request.allowed_tools or []

    new_user = User(
        _id=secrets.token_hex(12),
        name=request.name,
        email=request.email,
        password_hash=hashed_password,
        role=request.role,
        company_id=current_user["company_id"],
        job_title=request.job_title,
        allowed_tools=tools
    )
    
    users_col.insert_one(new_user.model_dump(by_alias=True))
    
    return {
        "id": new_user.id, 
        "email": new_user.email, 
        "role": new_user.role,
        "allowed_tools": new_user.allowed_tools,
        "status": "created",
        "job_title": new_user.job_title
    }

@app.put("/admin/users/{user_id}")
def update_company_user(
    user_id: str,
    request: UpdateUserRequest,
    current_user: dict = Depends(get_current_user),
    users_col: Collection = Depends(get_users_collection)
):
    if current_user["role"] != "company_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    target_user = users_col.find_one({"_id": user_id, "company_id": current_user["company_id"]})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = {}
    if request.password:
        update_data["password_hash"] = get_password_hash(request.password)
    if request.allowed_tools is not None:
        if target_user["role"] == "company_admin":
             update_data["allowed_tools"] = ALL_SERVICES
        else:
             update_data["allowed_tools"] = request.allowed_tools
             
    if not update_data:
        return {"status": "no updates provided"}
        
    users_col.update_one({"_id": user_id}, {"$set": update_data})
    return {"status": "updated"}

@app.delete("/admin/users/{user_id}")
def delete_company_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    users_col: Collection = Depends(get_users_collection)
):
    if current_user["role"] != "company_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    target_user = users_col.find_one({"_id": user_id, "company_id": current_user["company_id"]})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user["email"] == current_user.get("sub"):
         raise HTTPException(status_code=400, detail="Cannot delete your own account")
         
    users_col.delete_one({"_id": user_id})
    return {"status": "deleted"}

@app.post("/auth/token")
def login_for_access_token(
    form_data: dict, 
    users: Collection = Depends(get_users_collection)
):
    # 1. Check Super Admin
    if form_data.get("username") == "admin" and form_data.get("password") == settings.SUPER_ADMIN_KEY:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": "admin",
                "role": "superadmin",
                "company_id": "system",
                "allowed_tools": ALL_SERVICES
            },
            expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

    # 2. Check Regular User
    username_input = form_data.get("username")
    # Allow login by email OR by exact name (case-insensitive preferred, but $regex is fine, let's just use exact match or case-insensitive)
    import re
    user = users.find_one({
        "$or": [
            {"email": username_input},
            {"name": re.compile(f"^{username_input}$", re.IGNORECASE)}
        ]
    })
    
    if not user or not verify_password(form_data.get("password"), user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Generate User Token with allowed_tools
    user_tools = user.get("allowed_tools", [])
    # Company admins always get full access regardless of DB value
    if user["role"] == "company_admin":
        user_tools = ALL_SERVICES

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user["email"],
            "name": user.get("name", ""),
            "role": user["role"],
            "company_id": user["company_id"],
            "allowed_tools": user_tools
        },
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Utility endpoint: available services ---

@app.get("/services/available")
def get_available_services():
    """Public endpoint returning the list of services for the UI."""
    return {"services": ALL_SERVICES}
