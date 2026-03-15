from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import random
import string
import re
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'lumina-contest-secret-key-2026')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Lumina - Premium Beauty Contest Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ============ MODELS ============

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    role: str
    created_at: str

class QAItem(BaseModel):
    question: str
    answer: str

class ContestantCreate(BaseModel):
    bio: Optional[str] = ""
    social_instagram: Optional[str] = ""
    social_facebook: Optional[str] = ""
    social_twitter: Optional[str] = ""
    social_tiktok: Optional[str] = ""
    age: Optional[int] = None
    location: Optional[str] = ""
    category_id: Optional[str] = None
    qa_items: Optional[List[QAItem]] = []

class ContestantUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    social_instagram: Optional[str] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    social_tiktok: Optional[str] = None
    age: Optional[int] = None
    location: Optional[str] = None
    category_id: Optional[str] = None
    photos: Optional[List[str]] = None
    qa_items: Optional[List[dict]] = None

class ContestantResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    full_name: str
    email: str
    slug: str
    bio: str
    photos: List[str]
    social_instagram: str
    social_facebook: str
    social_twitter: str
    social_tiktok: Optional[str]
    age: Optional[int]
    location: str
    category_id: Optional[str]
    category_name: Optional[str]
    vote_count: int
    status: str
    voting_link: str
    created_at: str
    round: Optional[str]
    rank: Optional[int] = None
    qa_items: Optional[List[dict]] = []

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_active: bool = True

class CategoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    is_active: bool
    contestant_count: int
    created_at: str

class RoundCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    max_contestants: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = False

class RoundResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    max_contestants: Optional[int]
    start_date: Optional[str]
    end_date: Optional[str]
    is_active: bool
    order: int
    created_at: str

class VoteRequest(BaseModel):
    email: EmailStr
    contestant_id: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    contestant_id: str
    otp: str

class OTPResponse(BaseModel):
    success: bool
    message: str
    otp_sent: bool = False

class VoteResponse(BaseModel):
    success: bool
    message: str
    new_vote_count: Optional[int] = None

class LeaderboardEntry(BaseModel):
    rank: int
    contestant_id: str
    full_name: str
    slug: str
    photo: str
    category_name: str
    vote_count: int
    round: Optional[str]

class AdminStatsResponse(BaseModel):
    total_contestants: int
    total_votes: int
    total_categories: int
    pending_approvals: int
    active_round: Optional[str]

# ============ HELPER FUNCTIONS ============

def generate_slug(name: str, year: int = 2026) -> str:
    """Generate URL-friendly slug from name"""
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower())
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return f"{year}/{slug}"

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        role = payload.get("role")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "role": role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def require_contestant(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["contestant", "admin"]:
        raise HTTPException(status_code=403, detail="Contestant access required")
    return current_user

# MOCKED Email function - Replace with SendGrid/SMTP later
async def send_otp_email(email: str, otp: str) -> bool:
    """
    MOCKED: Send OTP via email
    TODO: Replace with actual SendGrid/SMTP implementation
    """
    logging.info(f"[MOCKED EMAIL] Sending OTP {otp} to {email}")
    # In production, this would send actual email
    return True

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    """Register a new contestant"""
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "full_name": user.full_name,
        "password": hash_password(user.password),
        "phone": user.phone,
        "role": "contestant",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create contestant profile
    slug = generate_slug(user.full_name)
    contestant_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "full_name": user.full_name,
        "email": user.email,
        "slug": slug,
        "bio": "",
        "photos": [],
        "social_instagram": "",
        "social_facebook": "",
        "social_twitter": "",
        "social_tiktok": "",
        "age": None,
        "location": "",
        "category_id": None,
        "vote_count": 0,
        "status": "pending",
        "round": None,
        "qa_items": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contestants.insert_one(contestant_doc)
    
    token = create_token(user_id, "contestant")
    return {"token": token, "user": {"id": user_id, "email": user.email, "full_name": user.full_name, "role": "contestant"}}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "full_name": user["full_name"], "role": user["role"]}}

@api_router.get("/auth/me", response_model=dict)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============ CATEGORY ROUTES ============

@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(category: CategoryCreate, admin: dict = Depends(require_admin)):
    """Create a new contest category (Admin only)"""
    category_id = str(uuid.uuid4())
    category_doc = {
        "id": category_id,
        "name": category.name,
        "description": category.description or "",
        "is_active": category.is_active,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(category_doc)
    return CategoryResponse(
        id=category_id,
        name=category.name,
        description=category.description or "",
        is_active=category.is_active,
        contestant_count=0,
        created_at=category_doc["created_at"]
    )

@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(active_only: bool = False):
    """Get all categories"""
    query = {"is_active": True} if active_only else {}
    categories = await db.categories.find(query, {"_id": 0}).to_list(100)
    result = []
    for cat in categories:
        count = await db.contestants.count_documents({"category_id": cat["id"], "status": "approved"})
        result.append(CategoryResponse(
            id=cat["id"],
            name=cat["name"],
            description=cat.get("description", ""),
            is_active=cat.get("is_active", True),
            contestant_count=count,
            created_at=cat.get("created_at", "")
        ))
    return result

@api_router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, category: CategoryCreate, admin: dict = Depends(require_admin)):
    """Update category (Admin only)"""
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": {"name": category.name, "description": category.description, "is_active": category.is_active}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    cat = await db.categories.find_one({"id": category_id}, {"_id": 0})
    count = await db.contestants.count_documents({"category_id": category_id, "status": "approved"})
    return CategoryResponse(
        id=cat["id"],
        name=cat["name"],
        description=cat.get("description", ""),
        is_active=cat.get("is_active", True),
        contestant_count=count,
        created_at=cat.get("created_at", "")
    )

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, admin: dict = Depends(require_admin)):
    """Delete category (Admin only)"""
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True, "message": "Category deleted"}

# ============ ROUND ROUTES ============

@api_router.post("/rounds", response_model=RoundResponse)
async def create_round(round_data: RoundCreate, admin: dict = Depends(require_admin)):
    """Create a new contest round (Admin only)"""
    # Get next order number
    last_round = await db.rounds.find_one(sort=[("order", -1)])
    next_order = (last_round["order"] + 1) if last_round else 1
    
    round_id = str(uuid.uuid4())
    round_doc = {
        "id": round_id,
        "name": round_data.name,
        "description": round_data.description or "",
        "max_contestants": round_data.max_contestants,
        "start_date": round_data.start_date,
        "end_date": round_data.end_date,
        "is_active": round_data.is_active,
        "order": next_order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.rounds.insert_one(round_doc)
    return RoundResponse(**{k: v for k, v in round_doc.items() if k != "_id"})

@api_router.get("/rounds", response_model=List[RoundResponse])
async def get_rounds():
    """Get all rounds"""
    rounds = await db.rounds.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return [RoundResponse(**r) for r in rounds]

@api_router.put("/rounds/{round_id}", response_model=RoundResponse)
async def update_round(round_id: str, round_data: RoundCreate, admin: dict = Depends(require_admin)):
    """Update round (Admin only)"""
    update_dict = {
        "name": round_data.name,
        "description": round_data.description,
        "max_contestants": round_data.max_contestants,
        "start_date": round_data.start_date,
        "end_date": round_data.end_date,
        "is_active": round_data.is_active
    }
    result = await db.rounds.update_one({"id": round_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Round not found")
    
    round_doc = await db.rounds.find_one({"id": round_id}, {"_id": 0})
    return RoundResponse(**round_doc)

@api_router.post("/rounds/{round_id}/activate")
async def activate_round(round_id: str, admin: dict = Depends(require_admin)):
    """Activate a round and deactivate others (Admin only)"""
    await db.rounds.update_many({}, {"$set": {"is_active": False}})
    result = await db.rounds.update_one({"id": round_id}, {"$set": {"is_active": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Round not found")
    return {"success": True, "message": "Round activated"}

# ============ CONTESTANT ROUTES ============

@api_router.get("/contestants", response_model=List[ContestantResponse])
async def get_contestants(
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    round_name: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0
):
    """Get contestants with filters"""
    query = {}
    if status:
        query["status"] = status
    if category_id:
        query["category_id"] = category_id
    if round_name:
        query["round"] = round_name
    if search:
        query["full_name"] = {"$regex": search, "$options": "i"}
    
    contestants = await db.contestants.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for c in contestants:
        category_name = ""
        if c.get("category_id"):
            cat = await db.categories.find_one({"id": c["category_id"]}, {"_id": 0})
            category_name = cat["name"] if cat else ""
        
        base_url = os.environ.get('FRONTEND_URL', 'https://lumina-contest.com')
        result.append(ContestantResponse(
            id=c["id"],
            user_id=c["user_id"],
            full_name=c["full_name"],
            email=c["email"],
            slug=c["slug"],
            bio=c.get("bio", ""),
            photos=c.get("photos", []),
            social_instagram=c.get("social_instagram", ""),
            social_facebook=c.get("social_facebook", ""),
            social_twitter=c.get("social_twitter", ""),
            age=c.get("age"),
            location=c.get("location", ""),
            category_id=c.get("category_id"),
            category_name=category_name,
            vote_count=c.get("vote_count", 0),
            status=c["status"],
            voting_link=f"{base_url}/{c['slug']}",
            created_at=c["created_at"],
            round=c.get("round")
        ))
    return result

@api_router.get("/contestants/slug/{year}/{slug}", response_model=ContestantResponse)
async def get_contestant_by_slug(year: str, slug: str):
    """Get contestant by slug for public voting page"""
    full_slug = f"{year}/{slug}"
    contestant = await db.contestants.find_one({"slug": full_slug, "status": "approved"}, {"_id": 0})
    if not contestant:
        raise HTTPException(status_code=404, detail="Contestant not found")
    
    category_name = ""
    if contestant.get("category_id"):
        cat = await db.categories.find_one({"id": contestant["category_id"]}, {"_id": 0})
        category_name = cat["name"] if cat else ""
    
    # Calculate rank
    rank = 1
    higher_vote_count = await db.contestants.count_documents({
        "status": "approved",
        "vote_count": {"$gt": contestant.get("vote_count", 0)}
    })
    rank = higher_vote_count + 1
    
    base_url = os.environ.get('FRONTEND_URL', 'https://lumina-contest.com')
    return ContestantResponse(
        id=contestant["id"],
        user_id=contestant["user_id"],
        full_name=contestant["full_name"],
        email=contestant["email"],
        slug=contestant["slug"],
        bio=contestant.get("bio", ""),
        photos=contestant.get("photos", []),
        social_instagram=contestant.get("social_instagram", ""),
        social_facebook=contestant.get("social_facebook", ""),
        social_twitter=contestant.get("social_twitter", ""),
        social_tiktok=contestant.get("social_tiktok", ""),
        age=contestant.get("age"),
        location=contestant.get("location", ""),
        category_id=contestant.get("category_id"),
        category_name=category_name,
        vote_count=contestant.get("vote_count", 0),
        status=contestant["status"],
        voting_link=f"{base_url}/{contestant['slug']}",
        created_at=contestant["created_at"],
        round=contestant.get("round"),
        rank=rank,
        qa_items=contestant.get("qa_items", [])
    )

@api_router.get("/contestants/{contestant_id}", response_model=ContestantResponse)
async def get_contestant(contestant_id: str):
    """Get contestant by ID"""
    contestant = await db.contestants.find_one({"id": contestant_id}, {"_id": 0})
    if not contestant:
        raise HTTPException(status_code=404, detail="Contestant not found")
    
    category_name = ""
    if contestant.get("category_id"):
        cat = await db.categories.find_one({"id": contestant["category_id"]}, {"_id": 0})
        category_name = cat["name"] if cat else ""
    
    base_url = os.environ.get('FRONTEND_URL', 'https://lumina-contest.com')
    return ContestantResponse(
        id=contestant["id"],
        user_id=contestant["user_id"],
        full_name=contestant["full_name"],
        email=contestant["email"],
        slug=contestant["slug"],
        bio=contestant.get("bio", ""),
        photos=contestant.get("photos", []),
        social_instagram=contestant.get("social_instagram", ""),
        social_facebook=contestant.get("social_facebook", ""),
        social_twitter=contestant.get("social_twitter", ""),
        age=contestant.get("age"),
        location=contestant.get("location", ""),
        category_id=contestant.get("category_id"),
        category_name=category_name,
        vote_count=contestant.get("vote_count", 0),
        status=contestant["status"],
        voting_link=f"{base_url}/{contestant['slug']}",
        created_at=contestant["created_at"],
        round=contestant.get("round")
    )

@api_router.get("/contestants/me/profile", response_model=ContestantResponse)
async def get_my_profile(current_user: dict = Depends(require_contestant)):
    """Get current contestant's profile"""
    contestant = await db.contestants.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    if not contestant:
        raise HTTPException(status_code=404, detail="Contestant profile not found")
    
    category_name = ""
    if contestant.get("category_id"):
        cat = await db.categories.find_one({"id": contestant["category_id"]}, {"_id": 0})
        category_name = cat["name"] if cat else ""
    
    base_url = os.environ.get('FRONTEND_URL', 'https://lumina-contest.com')
    return ContestantResponse(
        id=contestant["id"],
        user_id=contestant["user_id"],
        full_name=contestant["full_name"],
        email=contestant["email"],
        slug=contestant["slug"],
        bio=contestant.get("bio", ""),
        photos=contestant.get("photos", []),
        social_instagram=contestant.get("social_instagram", ""),
        social_facebook=contestant.get("social_facebook", ""),
        social_twitter=contestant.get("social_twitter", ""),
        age=contestant.get("age"),
        location=contestant.get("location", ""),
        category_id=contestant.get("category_id"),
        category_name=category_name,
        vote_count=contestant.get("vote_count", 0),
        status=contestant["status"],
        voting_link=f"{base_url}/{contestant['slug']}",
        created_at=contestant["created_at"],
        round=contestant.get("round")
    )

@api_router.put("/contestants/me/profile", response_model=ContestantResponse)
async def update_my_profile(update: ContestantUpdate, current_user: dict = Depends(require_contestant)):
    """Update current contestant's profile"""
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "full_name" in update_dict:
        update_dict["slug"] = generate_slug(update_dict["full_name"])
        await db.users.update_one({"id": current_user["user_id"]}, {"$set": {"full_name": update_dict["full_name"]}})
    
    if update_dict:
        await db.contestants.update_one({"user_id": current_user["user_id"]}, {"$set": update_dict})
    
    return await get_my_profile(current_user)

@api_router.post("/contestants/me/photos")
async def upload_photo(file: UploadFile = File(...), current_user: dict = Depends(require_contestant)):
    """Upload contestant photo (stored as base64 for simplicity - replace with cloud storage)"""
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    content_type = file.content_type or "image/jpeg"
    data_url = f"data:{content_type};base64,{base64_image}"
    
    await db.contestants.update_one(
        {"user_id": current_user["user_id"]},
        {"$push": {"photos": data_url}}
    )
    return {"success": True, "photo_url": data_url}

@api_router.delete("/contestants/me/photos/{photo_index}")
async def delete_photo(photo_index: int, current_user: dict = Depends(require_contestant)):
    """Delete a photo by index"""
    contestant = await db.contestants.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    if not contestant:
        raise HTTPException(status_code=404, detail="Contestant not found")
    
    photos = contestant.get("photos", [])
    if photo_index < 0 or photo_index >= len(photos):
        raise HTTPException(status_code=400, detail="Invalid photo index")
    
    photos.pop(photo_index)
    await db.contestants.update_one({"user_id": current_user["user_id"]}, {"$set": {"photos": photos}})
    return {"success": True, "message": "Photo deleted"}

# Admin contestant management
@api_router.put("/admin/contestants/{contestant_id}/status")
async def update_contestant_status(contestant_id: str, status: str = Query(...), admin: dict = Depends(require_admin)):
    """Update contestant status (Admin only)"""
    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.contestants.update_one({"id": contestant_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contestant not found")
    return {"success": True, "message": f"Contestant status updated to {status}"}

@api_router.put("/admin/contestants/{contestant_id}/round")
async def assign_contestant_round(contestant_id: str, round_name: str = Query(...), admin: dict = Depends(require_admin)):
    """Assign contestant to a round (Admin only)"""
    result = await db.contestants.update_one({"id": contestant_id}, {"$set": {"round": round_name}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contestant not found")
    return {"success": True, "message": f"Contestant assigned to {round_name}"}

@api_router.delete("/admin/contestants/{contestant_id}")
async def delete_contestant(contestant_id: str, admin: dict = Depends(require_admin)):
    """Delete contestant (Admin only)"""
    contestant = await db.contestants.find_one({"id": contestant_id}, {"_id": 0})
    if not contestant:
        raise HTTPException(status_code=404, detail="Contestant not found")
    
    await db.contestants.delete_one({"id": contestant_id})
    await db.users.delete_one({"id": contestant["user_id"]})
    await db.votes.delete_many({"contestant_id": contestant_id})
    return {"success": True, "message": "Contestant deleted"}

# ============ VOTING ROUTES ============

@api_router.post("/vote/request-otp", response_model=OTPResponse)
async def request_vote_otp(request: VoteRequest):
    """Request OTP for voting"""
    # Check if contestant exists and is approved
    contestant = await db.contestants.find_one({"id": request.contestant_id, "status": "approved"}, {"_id": 0})
    if not contestant:
        raise HTTPException(status_code=404, detail="Contestant not found or not approved")
    
    # Check if user already voted in last 24 hours
    twenty_four_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    existing_vote = await db.votes.find_one({
        "email": request.email,
        "contestant_id": request.contestant_id,
        "created_at": {"$gte": twenty_four_hours_ago}
    })
    
    if existing_vote:
        raise HTTPException(status_code=429, detail="You can only vote once every 24 hours for this contestant")
    
    # Generate and store OTP
    otp = generate_otp()
    otp_doc = {
        "id": str(uuid.uuid4()),
        "email": request.email,
        "contestant_id": request.contestant_id,
        "otp": otp,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    }
    await db.otps.insert_one(otp_doc)
    
    # Send OTP via email (MOCKED)
    await send_otp_email(request.email, otp)
    
    # For development, also return OTP in response (remove in production!)
    return OTPResponse(
        success=True,
        message=f"OTP sent to {request.email}. [DEV MODE: OTP is {otp}]",
        otp_sent=True
    )

@api_router.post("/vote/verify", response_model=VoteResponse)
async def verify_otp_and_vote(request: OTPVerifyRequest):
    """Verify OTP and cast vote"""
    # Find valid OTP
    now = datetime.now(timezone.utc).isoformat()
    otp_doc = await db.otps.find_one({
        "email": request.email,
        "contestant_id": request.contestant_id,
        "otp": request.otp,
        "used": False,
        "expires_at": {"$gte": now}
    })
    
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Mark OTP as used
    await db.otps.update_one({"id": otp_doc["id"]}, {"$set": {"used": True}})
    
    # Check 24-hour voting limit
    twenty_four_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    existing_vote = await db.votes.find_one({
        "email": request.email,
        "contestant_id": request.contestant_id,
        "created_at": {"$gte": twenty_four_hours_ago}
    })
    
    if existing_vote:
        raise HTTPException(status_code=429, detail="You can only vote once every 24 hours for this contestant")
    
    # Record vote
    vote_doc = {
        "id": str(uuid.uuid4()),
        "email": request.email,
        "contestant_id": request.contestant_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.votes.insert_one(vote_doc)
    
    # Increment vote count
    result = await db.contestants.find_one_and_update(
        {"id": request.contestant_id},
        {"$inc": {"vote_count": 1}},
        return_document=True
    )
    
    return VoteResponse(
        success=True,
        message="Vote cast successfully! Thank you for voting.",
        new_vote_count=result["vote_count"] if result else None
    )

# ============ LEADERBOARD ROUTES ============

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    category_id: Optional[str] = None,
    round_name: Optional[str] = None,
    limit: int = Query(50, le=100)
):
    """Get leaderboard sorted by vote count"""
    query = {"status": "approved"}
    if category_id:
        query["category_id"] = category_id
    if round_name:
        query["round"] = round_name
    
    contestants = await db.contestants.find(query, {"_id": 0}).sort("vote_count", -1).limit(limit).to_list(limit)
    
    result = []
    for i, c in enumerate(contestants, 1):
        category_name = ""
        if c.get("category_id"):
            cat = await db.categories.find_one({"id": c["category_id"]}, {"_id": 0})
            category_name = cat["name"] if cat else ""
        
        result.append(LeaderboardEntry(
            rank=i,
            contestant_id=c["id"],
            full_name=c["full_name"],
            slug=c["slug"],
            photo=c["photos"][0] if c.get("photos") else "",
            category_name=category_name,
            vote_count=c.get("vote_count", 0),
            round=c.get("round")
        ))
    return result

# ============ ADMIN STATS ============

@api_router.get("/admin/stats", response_model=AdminStatsResponse)
async def get_admin_stats(admin: dict = Depends(require_admin)):
    """Get admin dashboard statistics"""
    total_contestants = await db.contestants.count_documents({})
    total_votes = await db.votes.count_documents({})
    total_categories = await db.categories.count_documents({})
    pending_approvals = await db.contestants.count_documents({"status": "pending"})
    
    active_round = await db.rounds.find_one({"is_active": True}, {"_id": 0})
    
    return AdminStatsResponse(
        total_contestants=total_contestants,
        total_votes=total_votes,
        total_categories=total_categories,
        pending_approvals=pending_approvals,
        active_round=active_round["name"] if active_round else None
    )

@api_router.get("/admin/votes", response_model=List[dict])
async def get_vote_analytics(
    contestant_id: Optional[str] = None,
    limit: int = Query(100, le=500),
    admin: dict = Depends(require_admin)
):
    """Get vote analytics (Admin only)"""
    query = {}
    if contestant_id:
        query["contestant_id"] = contestant_id
    
    votes = await db.votes.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return votes

# ============ SEED ADMIN ============

@api_router.post("/seed/admin")
async def seed_admin():
    """Create default admin user (for initial setup)"""
    existing = await db.users.find_one({"email": "admin@lumina.com"})
    if existing:
        return {"message": "Admin already exists", "email": "admin@lumina.com", "password": "admin123"}
    
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "email": "admin@lumina.com",
        "full_name": "Lumina Admin",
        "password": hash_password("admin123"),
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)
    return {"message": "Admin created", "email": "admin@lumina.com", "password": "admin123"}

# ============ HEALTH CHECK ============

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "lumina-contest-api"}

# Include the router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
