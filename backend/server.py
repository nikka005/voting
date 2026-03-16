from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import random
import string
import re
import base64
import asyncio
import json
from collections import defaultdict

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

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app
app = FastAPI(title="Glowing Star - Premium Beauty Contest Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ============ WEBSOCKET CONNECTION MANAGER ============

class ConnectionManager:
    """Manage WebSocket connections for real-time updates"""
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = defaultdict(list)
        self.contestant_subscribers: Dict[str, List[WebSocket]] = defaultdict(list)
    
    async def connect(self, websocket: WebSocket, room: str = "global"):
        await websocket.accept()
        self.active_connections[room].append(websocket)
    
    async def connect_contestant(self, websocket: WebSocket, contestant_id: str):
        await websocket.accept()
        self.contestant_subscribers[contestant_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, room: str = "global"):
        if websocket in self.active_connections[room]:
            self.active_connections[room].remove(websocket)
    
    def disconnect_contestant(self, websocket: WebSocket, contestant_id: str):
        if websocket in self.contestant_subscribers[contestant_id]:
            self.contestant_subscribers[contestant_id].remove(websocket)
    
    async def broadcast(self, message: dict, room: str = "global"):
        """Broadcast to all connections in a room"""
        for connection in self.active_connections[room]:
            try:
                await connection.send_json(message)
            except:
                pass
    
    async def broadcast_vote(self, contestant_id: str, vote_count: int, voter_email: str = None):
        """Broadcast vote update to all interested parties"""
        message = {
            "type": "vote_update",
            "contestant_id": contestant_id,
            "vote_count": vote_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        # Broadcast to global room (admin/leaderboard)
        await self.broadcast(message, "global")
        await self.broadcast(message, "leaderboard")
        # Broadcast to contestant-specific subscribers
        for ws in self.contestant_subscribers.get(contestant_id, []):
            try:
                await ws.send_json(message)
            except:
                pass

manager = ConnectionManager()

# ============ FRAUD DETECTION SYSTEM ============

class FraudDetector:
    """Advanced fraud detection for voting system"""
    
    def __init__(self):
        self.ip_vote_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.suspicious_patterns = []
        self.blocked_ips: set = set()
        self.blocked_emails: set = set()
        self.suspicious_domains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email']
    
    async def check_ip_pattern(self, ip: str, contestant_id: str) -> dict:
        """Check for suspicious IP voting patterns"""
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        key = f"{today}:{ip}"
        
        # Count votes from this IP today
        self.ip_vote_counts[key][contestant_id] += 1
        
        total_votes_from_ip = sum(self.ip_vote_counts[key].values())
        votes_for_contestant = self.ip_vote_counts[key][contestant_id]
        
        is_suspicious = False
        reason = None
        
        # Check if IP is blocked
        if ip in self.blocked_ips:
            return {"blocked": True, "reason": "IP has been blocked for suspicious activity"}
        
        # Flag if too many votes from same IP
        if total_votes_from_ip > 50:
            is_suspicious = True
            reason = f"Excessive votes from IP: {total_votes_from_ip} votes today"
        
        # Flag if voting for same contestant multiple times (shouldn't happen with 24h limit)
        if votes_for_contestant > 2:
            is_suspicious = True
            reason = f"Multiple vote attempts for same contestant from IP"
        
        return {
            "blocked": False,
            "suspicious": is_suspicious,
            "reason": reason,
            "ip_vote_count": total_votes_from_ip
        }
    
    def check_email_domain(self, email: str) -> dict:
        """Check for suspicious email domains"""
        if email in self.blocked_emails:
            return {"blocked": True, "reason": "Email has been blocked"}
        
        domain = email.split('@')[-1].lower()
        
        if domain in self.suspicious_domains:
            return {"suspicious": True, "reason": f"Suspicious email domain: {domain}"}
        
        # Check for disposable email patterns
        if any(x in domain for x in ['temp', 'fake', 'throw', 'disposable', 'trash']):
            return {"suspicious": True, "reason": "Possible disposable email"}
        
        return {"blocked": False, "suspicious": False}
    
    def check_vote_velocity(self, email: str, recent_votes: List[dict]) -> dict:
        """Check voting velocity patterns"""
        if len(recent_votes) < 2:
            return {"suspicious": False}
        
        # Check if voting too fast for different contestants
        time_diffs = []
        for i in range(1, len(recent_votes)):
            t1 = datetime.fromisoformat(recent_votes[i-1].get('created_at', '').replace('Z', '+00:00'))
            t2 = datetime.fromisoformat(recent_votes[i].get('created_at', '').replace('Z', '+00:00'))
            time_diffs.append(abs((t2 - t1).total_seconds()))
        
        avg_diff = sum(time_diffs) / len(time_diffs) if time_diffs else float('inf')
        
        # If average time between votes is less than 30 seconds, suspicious
        if avg_diff < 30 and len(recent_votes) > 5:
            return {"suspicious": True, "reason": "Suspicious voting velocity"}
        
        return {"suspicious": False}
    
    async def block_ip(self, ip: str, reason: str):
        """Block an IP address"""
        self.blocked_ips.add(ip)
        await db.blocked_ips.insert_one({
            "ip": ip,
            "reason": reason,
            "blocked_at": datetime.now(timezone.utc).isoformat()
        })
    
    async def block_email(self, email: str, reason: str):
        """Block an email address"""
        self.blocked_emails.add(email)
        await db.blocked_emails.insert_one({
            "email": email,
            "reason": reason,
            "blocked_at": datetime.now(timezone.utc).isoformat()
        })
    
    async def log_suspicious_activity(self, activity_type: str, details: dict):
        """Log suspicious activity for review"""
        await db.fraud_logs.insert_one({
            "id": str(uuid.uuid4()),
            "type": activity_type,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

fraud_detector = FraudDetector()

# ============ EMAIL NOTIFICATION TEMPLATES ============

class EmailTemplates:
    """Email notification templates"""
    
    @staticmethod
    def otp_template(otp: str, contestant_name: str = "the contestant") -> dict:
        return {
            "subject": f"Your Voting OTP - Glamour Beauty Contest",
            "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }}
                    .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #ec4899, #8b5cf6); padding: 30px; text-align: center; }}
                    .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                    .content {{ padding: 30px; }}
                    .otp-box {{ background: linear-gradient(135deg, #fdf2f8, #f5f3ff); border: 2px dashed #ec4899; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }}
                    .otp {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ec4899; }}
                    .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✨ Glamour Beauty Contest</h1>
                    </div>
                    <div class="content">
                        <h2>Your Voting Verification Code</h2>
                        <p>Thank you for voting for <strong>{contestant_name}</strong>!</p>
                        <p>Use this OTP to verify your vote:</p>
                        <div class="otp-box">
                            <div class="otp">{otp}</div>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>Glamour Beauty Contest © 2026</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "text": f"Your Glamour Beauty Contest voting OTP is: {otp}. This code expires in 10 minutes."
        }
    
    @staticmethod
    def vote_confirmation_template(contestant_name: str, vote_count: int) -> dict:
        return {
            "subject": f"Vote Confirmed! - Glamour Beauty Contest",
            "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }}
                    .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #10b981, #06b6d4); padding: 30px; text-align: center; }}
                    .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                    .content {{ padding: 30px; text-align: center; }}
                    .vote-icon {{ font-size: 60px; margin-bottom: 20px; }}
                    .count {{ font-size: 48px; font-weight: bold; color: #ec4899; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Vote Confirmed!</h1>
                    </div>
                    <div class="content">
                        <div class="vote-icon">💖</div>
                        <h2>Thank you for voting!</h2>
                        <p>Your vote for <strong>{contestant_name}</strong> has been recorded.</p>
                        <p>They now have:</p>
                        <div class="count">{vote_count}</div>
                        <p>total votes</p>
                        <p style="margin-top: 20px; color: #64748b;">You can vote again in 24 hours!</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "text": f"Your vote for {contestant_name} has been confirmed! They now have {vote_count} total votes."
        }
    
    @staticmethod
    def round_qualification_template(contestant_name: str, round_name: str) -> dict:
        return {
            "subject": f"🎉 Congratulations! You've qualified for {round_name}!",
            "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }}
                    .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }}
                    .header {{ background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 40px; text-align: center; }}
                    .header h1 {{ color: white; margin: 0; font-size: 28px; }}
                    .trophy {{ font-size: 80px; }}
                    .content {{ padding: 30px; text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="trophy">🏆</div>
                        <h1>Congratulations!</h1>
                    </div>
                    <div class="content">
                        <h2>Hey {contestant_name}!</h2>
                        <p>Amazing news! You've qualified for:</p>
                        <h3 style="color: #ec4899; font-size: 28px;">{round_name}</h3>
                        <p>Keep sharing your voting link to climb higher in the rankings!</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "text": f"Congratulations {contestant_name}! You've qualified for {round_name} in the Glamour Beauty Contest!"
        }
    
    @staticmethod
    def payment_confirmation_template(package_name: str, votes: int, amount: float) -> dict:
        return {
            "subject": f"Payment Confirmed - {votes} Votes Added!",
            "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }}
                    .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }}
                    .header {{ background: linear-gradient(135deg, #8b5cf6, #ec4899); padding: 30px; text-align: center; }}
                    .header h1 {{ color: white; margin: 0; }}
                    .content {{ padding: 30px; }}
                    .receipt {{ background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>💳 Payment Confirmed</h1>
                    </div>
                    <div class="content">
                        <h2>Thank you for your purchase!</h2>
                        <div class="receipt">
                            <p><strong>Package:</strong> {package_name}</p>
                            <p><strong>Votes:</strong> {votes}</p>
                            <p><strong>Amount:</strong> ${amount:.2f}</p>
                        </div>
                        <p>Your votes have been added to the contestant's total!</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "text": f"Payment confirmed! {votes} votes ({package_name}) for ${amount:.2f} have been added."
        }

email_templates = EmailTemplates()

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
    profession: Optional[str] = None
    achievements: Optional[str] = None

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
    profession: Optional[str] = None
    achievements: Optional[str] = None

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

# ============ PAID VOTING MODELS ============

class VotePackage(BaseModel):
    id: str
    name: str
    votes: int
    price: float
    popular: bool = False

class CheckoutRequest(BaseModel):
    package_id: str
    contestant_id: str
    origin_url: str

class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str

# Vote Packages - FIXED PRICES (security: never accept from frontend)
VOTE_PACKAGES = {
    "starter": VotePackage(id="starter", name="Starter Pack", votes=10, price=5.00, popular=False),
    "popular": VotePackage(id="popular", name="Popular Pack", votes=50, price=20.00, popular=True),
    "mega": VotePackage(id="mega", name="Mega Pack", votes=100, price=35.00, popular=False),
    "ultimate": VotePackage(id="ultimate", name="Ultimate Pack", votes=250, price=75.00, popular=False),
}

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

# MOCKED Email function - Replace with SendGrid later
async def send_otp_email(email: str, otp: str, contestant_name: str = "the contestant") -> bool:
    """
    MOCKED: Send OTP via email
    TODO: Replace with actual SendGrid implementation
    """
    template = email_templates.otp_template(otp, contestant_name)
    logging.info(f"[MOCKED EMAIL] Subject: {template['subject']}")
    logging.info(f"[MOCKED EMAIL] To: {email}")
    logging.info(f"[MOCKED EMAIL] OTP: {otp}")
    return True

async def send_vote_confirmation_email(email: str, contestant_name: str, vote_count: int) -> bool:
    """Send vote confirmation email"""
    template = email_templates.vote_confirmation_template(contestant_name, vote_count)
    logging.info(f"[MOCKED EMAIL] Vote confirmation sent to {email}")
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
        "paid_vote_count": 0,
        "status": "pending",
        "round": None,
        "qa_items": [],
        "profession": "",
        "achievements": "",
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
        
        base_url = os.environ.get('FRONTEND_URL', 'https://glamour-contest.com')
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
            social_tiktok=c.get("social_tiktok", ""),
            age=c.get("age"),
            location=c.get("location", ""),
            category_id=c.get("category_id"),
            category_name=category_name,
            vote_count=c.get("vote_count", 0),
            status=c["status"],
            voting_link=f"{base_url}/{c['slug']}",
            created_at=c["created_at"],
            round=c.get("round"),
            qa_items=c.get("qa_items", []),
            profession=c.get("profession"),
            achievements=c.get("achievements")
        ))
    return result

@api_router.get("/contestants/slug/{year}/{slug}", response_model=ContestantResponse)
async def get_contestant_by_slug(year: str, slug: str):
    """Get contestant by slug for public voting page"""
    full_slug = f"{year}/{slug}"
    contestant = await db.contestants.find_one({"slug": full_slug}, {"_id": 0})
    
    if not contestant:
        raise HTTPException(status_code=404, detail="Contestant not found")
    
    category_name = ""
    if contestant.get("category_id"):
        cat = await db.categories.find_one({"id": contestant["category_id"]}, {"_id": 0})
        category_name = cat["name"] if cat else ""
    
    base_url = os.environ.get('FRONTEND_URL', 'https://glamour-contest.com')
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
        qa_items=contestant.get("qa_items", []),
        profession=contestant.get("profession"),
        achievements=contestant.get("achievements")
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
    
    base_url = os.environ.get('FRONTEND_URL', 'https://glamour-contest.com')
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
        qa_items=contestant.get("qa_items", []),
        profession=contestant.get("profession"),
        achievements=contestant.get("achievements")
    )

@api_router.get("/contestants/me/profile", response_model=ContestantResponse)
async def get_my_profile(current_user: dict = Depends(require_contestant)):
    """Get current contestant's profile"""
    contestant = await db.contestants.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    if not contestant:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    category_name = ""
    if contestant.get("category_id"):
        cat = await db.categories.find_one({"id": contestant["category_id"]}, {"_id": 0})
        category_name = cat["name"] if cat else ""
    
    base_url = os.environ.get('FRONTEND_URL', 'https://glamour-contest.com')
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
        qa_items=contestant.get("qa_items", []),
        profession=contestant.get("profession"),
        achievements=contestant.get("achievements")
    )

@api_router.put("/contestants/me/profile", response_model=ContestantResponse)
async def update_my_profile(update: ContestantUpdate, current_user: dict = Depends(require_contestant)):
    """Update current contestant's profile"""
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update_dict:
        await db.contestants.update_one(
            {"user_id": current_user["user_id"]},
            {"$set": update_dict}
        )
        if "full_name" in update_dict:
            await db.users.update_one(
                {"id": current_user["user_id"]},
                {"$set": {"full_name": update_dict["full_name"]}}
            )
    
    return await get_my_profile(current_user)

@api_router.post("/contestants/me/photos")
async def upload_photo(file: UploadFile = File(...), current_user: dict = Depends(require_contestant)):
    """Upload a photo to contestant's gallery"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")
    
    base64_image = f"data:{file.content_type};base64,{base64.b64encode(contents).decode('utf-8')}"
    
    await db.contestants.update_one(
        {"user_id": current_user["user_id"]},
        {"$push": {"photos": base64_image}}
    )
    
    return {"success": True, "message": "Photo uploaded successfully"}

@api_router.delete("/contestants/me/photos/{photo_index}")
async def delete_photo(photo_index: int, current_user: dict = Depends(require_contestant)):
    """Delete a photo from contestant's gallery"""
    contestant = await db.contestants.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    if not contestant or not contestant.get("photos"):
        raise HTTPException(status_code=404, detail="No photos found")
    
    if photo_index < 0 or photo_index >= len(contestant["photos"]):
        raise HTTPException(status_code=400, detail="Invalid photo index")
    
    photos = contestant["photos"]
    photos.pop(photo_index)
    
    await db.contestants.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"photos": photos}}
    )
    
    return {"success": True, "message": "Photo deleted"}

# ============ ADMIN CONTESTANT MANAGEMENT ============

@api_router.put("/admin/contestants/{contestant_id}/status")
async def update_contestant_status(contestant_id: str, status: str = Query(...), admin: dict = Depends(require_admin)):
    """Update contestant status (Admin only)"""
    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.contestants.update_one({"id": contestant_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contestant not found")
    
    return {"success": True, "message": f"Contestant {status}"}

@api_router.put("/admin/contestants/{contestant_id}/round")
async def assign_contestant_round(contestant_id: str, round_name: str = Query(...), admin: dict = Depends(require_admin)):
    """Assign contestant to a round (Admin only)"""
    result = await db.contestants.update_one({"id": contestant_id}, {"$set": {"round": round_name}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contestant not found")
    
    return {"success": True, "message": f"Contestant assigned to {round_name}"}

@api_router.delete("/admin/contestants/{contestant_id}")
async def delete_contestant(contestant_id: str, admin: dict = Depends(require_admin)):
    """Delete contestant and their votes (Admin only)"""
    contestant = await db.contestants.find_one({"id": contestant_id}, {"_id": 0})
    if not contestant:
        raise HTTPException(status_code=404, detail="Contestant not found")
    
    await db.contestants.delete_one({"id": contestant_id})
    await db.votes.delete_many({"contestant_id": contestant_id})
    await db.users.delete_one({"id": contestant["user_id"]})
    
    return {"success": True, "message": "Contestant deleted"}

# ============ VOTING ROUTES WITH FRAUD DETECTION ============

@api_router.post("/vote/request-otp", response_model=OTPResponse)
async def request_vote_otp(request: VoteRequest, http_request: Request):
    """Request OTP to vote for a contestant"""
    # Get client IP for fraud detection
    client_ip = http_request.client.host if http_request.client else "unknown"
    
    # Check fraud detection
    email_check = fraud_detector.check_email_domain(request.email)
    if email_check.get("blocked"):
        raise HTTPException(status_code=403, detail=email_check["reason"])
    
    ip_check = await fraud_detector.check_ip_pattern(client_ip, request.contestant_id)
    if ip_check.get("blocked"):
        raise HTTPException(status_code=403, detail=ip_check["reason"])
    
    # Log suspicious activity
    if email_check.get("suspicious") or ip_check.get("suspicious"):
        await fraud_detector.log_suspicious_activity("vote_attempt", {
            "email": request.email,
            "ip": client_ip,
            "contestant_id": request.contestant_id,
            "email_reason": email_check.get("reason"),
            "ip_reason": ip_check.get("reason")
        })
    
    # Check contestant exists and is approved
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
        "ip_address": client_ip,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    }
    await db.otps.insert_one(otp_doc)
    
    # Send OTP via email (MOCKED)
    await send_otp_email(request.email, otp, contestant["full_name"])
    
    return OTPResponse(
        success=True,
        message=f"OTP sent to {request.email}. [DEV MODE: OTP is {otp}]",
        otp_sent=True
    )

@api_router.post("/vote/verify", response_model=VoteResponse)
async def verify_otp_and_vote(request: OTPVerifyRequest, http_request: Request):
    """Verify OTP and cast vote"""
    client_ip = http_request.client.host if http_request.client else "unknown"
    
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
        "ip_address": client_ip,
        "vote_type": "free",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.votes.insert_one(vote_doc)
    
    # Increment vote count
    result = await db.contestants.find_one_and_update(
        {"id": request.contestant_id},
        {"$inc": {"vote_count": 1}},
        return_document=True
    )
    
    # Broadcast vote update via WebSocket
    await manager.broadcast_vote(request.contestant_id, result["vote_count"] if result else 0, request.email)
    
    # Send confirmation email
    if result:
        await send_vote_confirmation_email(request.email, result["full_name"], result["vote_count"])
    
    return VoteResponse(
        success=True,
        message="Vote cast successfully! Thank you for voting.",
        new_vote_count=result["vote_count"] if result else None
    )

# ============ PAID VOTING ROUTES (STRIPE) ============

@api_router.get("/vote-packages", response_model=List[VotePackage])
async def get_vote_packages():
    """Get available vote packages"""
    return list(VOTE_PACKAGES.values())

@api_router.post("/checkout/create", response_model=CheckoutResponse)
async def create_checkout_session(request: CheckoutRequest, http_request: Request):
    """Create Stripe checkout session for paid votes"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    # Validate package
    if request.package_id not in VOTE_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    package = VOTE_PACKAGES[request.package_id]
    
    # Validate contestant exists
    contestant = await db.contestants.find_one({"id": request.contestant_id, "status": "approved"}, {"_id": 0})
    if not contestant:
        raise HTTPException(status_code=404, detail="Contestant not found or not approved")
    
    # Build URLs from frontend origin
    success_url = f"{request.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/payment/cancel"
    
    # Initialize Stripe
    host_url = str(http_request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session with metadata
    checkout_request = CheckoutSessionRequest(
        amount=package.price,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "package_id": package.id,
            "package_name": package.name,
            "votes": str(package.votes),
            "contestant_id": request.contestant_id,
            "contestant_name": contestant["full_name"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "package_id": package.id,
        "package_name": package.name,
        "votes": package.votes,
        "amount": package.price,
        "currency": "usd",
        "contestant_id": request.contestant_id,
        "contestant_name": contestant["full_name"],
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction_doc)
    
    return CheckoutResponse(
        checkout_url=session.url,
        session_id=session.session_id
    )

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str):
    """Get checkout session status and process payment if successful"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    # Check if already processed
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction["payment_status"] == "completed":
        return {
            "status": "complete",
            "payment_status": "paid",
            "message": "Votes already added",
            "votes_added": transaction["votes"]
        }
    
    # Get status from Stripe
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # If payment successful, add votes
    if status.payment_status == "paid" and transaction["payment_status"] != "completed":
        # Add votes to contestant
        await db.contestants.update_one(
            {"id": transaction["contestant_id"]},
            {"$inc": {"vote_count": transaction["votes"], "paid_vote_count": transaction["votes"]}}
        )
        
        # Update transaction status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Record paid votes
        for i in range(transaction["votes"]):
            vote_doc = {
                "id": str(uuid.uuid4()),
                "email": f"paid-{session_id}",
                "contestant_id": transaction["contestant_id"],
                "vote_type": "paid",
                "package_id": transaction["package_id"],
                "session_id": session_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.votes.insert_one(vote_doc)
        
        # Get updated vote count
        contestant = await db.contestants.find_one({"id": transaction["contestant_id"]}, {"_id": 0})
        
        # Broadcast vote update
        if contestant:
            await manager.broadcast_vote(transaction["contestant_id"], contestant["vote_count"])
        
        return {
            "status": "complete",
            "payment_status": "paid",
            "message": f"{transaction['votes']} votes added successfully!",
            "votes_added": transaction["votes"],
            "new_vote_count": contestant["vote_count"] if contestant else None
        }
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total / 100,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        
        if event.payment_status == "paid":
            # Process payment (same logic as get_checkout_status)
            transaction = await db.payment_transactions.find_one({"session_id": event.session_id}, {"_id": 0})
            
            if transaction and transaction["payment_status"] != "completed":
                await db.contestants.update_one(
                    {"id": transaction["contestant_id"]},
                    {"$inc": {"vote_count": transaction["votes"], "paid_vote_count": transaction["votes"]}}
                )
                
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {"payment_status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
                )
        
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

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

@api_router.get("/admin/fraud-logs")
async def get_fraud_logs(
    limit: int = Query(100, le=500),
    admin: dict = Depends(require_admin)
):
    """Get fraud detection logs (Admin only)"""
    logs = await db.fraud_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

@api_router.post("/admin/block-ip")
async def admin_block_ip(ip: str = Query(...), reason: str = Query(...), admin: dict = Depends(require_admin)):
    """Block an IP address (Admin only)"""
    await fraud_detector.block_ip(ip, reason)
    return {"success": True, "message": f"IP {ip} blocked"}

@api_router.post("/admin/block-email")
async def admin_block_email(email: str = Query(...), reason: str = Query(...), admin: dict = Depends(require_admin)):
    """Block an email address (Admin only)"""
    await fraud_detector.block_email(email, reason)
    return {"success": True, "message": f"Email {email} blocked"}

@api_router.get("/admin/payment-transactions")
async def get_payment_transactions(
    limit: int = Query(100, le=500),
    admin: dict = Depends(require_admin)
):
    """Get payment transaction history (Admin only)"""
    transactions = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return transactions

# ============ WEBSOCKET ENDPOINTS ============

@app.websocket("/ws/votes")
async def websocket_votes(websocket: WebSocket):
    """WebSocket endpoint for real-time vote updates"""
    await manager.connect(websocket, "global")
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # Echo back any received data (heartbeat)
            await websocket.send_json({"type": "heartbeat", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket, "global")

@app.websocket("/ws/leaderboard")
async def websocket_leaderboard(websocket: WebSocket):
    """WebSocket endpoint for real-time leaderboard updates"""
    await manager.connect(websocket, "leaderboard")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, "leaderboard")

@app.websocket("/ws/contestant/{contestant_id}")
async def websocket_contestant(websocket: WebSocket, contestant_id: str):
    """WebSocket endpoint for real-time updates for a specific contestant"""
    await manager.connect_contestant(websocket, contestant_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_contestant(websocket, contestant_id)

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
        "full_name": "Glamour Admin",
        "password": hash_password("admin123"),
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)
    return {"message": "Admin created", "email": "admin@lumina.com", "password": "admin123"}

# ============ HEALTH CHECK ============

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "glowing-star-contest-api", "features": ["stripe", "websocket", "fraud-detection", "email-templates"]}

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
