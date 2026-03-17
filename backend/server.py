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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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

# SMTP Email Configuration (loaded from DB or env)
SMTP_CONFIG = {
    'voting_site': {
        'host': os.environ.get('SMTP_HOST_VOTING', ''),
        'port': int(os.environ.get('SMTP_PORT_VOTING', 587)),
        'username': os.environ.get('SMTP_USER_VOTING', ''),
        'password': os.environ.get('SMTP_PASS_VOTING', ''),
        'from_email': os.environ.get('SMTP_FROM_VOTING', 'noreply@glowingstar.vote'),
        'from_name': os.environ.get('SMTP_FROM_NAME_VOTING', 'Glowing Star Voting'),
    },
    'user_site': {
        'host': os.environ.get('SMTP_HOST_USER', ''),
        'port': int(os.environ.get('SMTP_PORT_USER', 587)),
        'username': os.environ.get('SMTP_USER_USER', ''),
        'password': os.environ.get('SMTP_PASS_USER', ''),
        'from_email': os.environ.get('SMTP_FROM_USER', 'noreply@glowingstar.net'),
        'from_name': os.environ.get('SMTP_FROM_NAME_USER', 'Glowing Star Contest'),
    }
}

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
    """Email notification templates for Glowing Star Contest"""
    
    @staticmethod
    def otp_template(otp: str, contestant_name: str = "the contestant") -> dict:
        return {
            "subject": f"Your Voting OTP - Glowing Star Beauty Contest",
            "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }}
                    .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #f59e0b, #f97316); padding: 30px; text-align: center; }}
                    .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                    .content {{ padding: 30px; }}
                    .otp-box {{ background: linear-gradient(135deg, #fef3c7, #ffedd5); border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }}
                    .otp {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f59e0b; }}
                    .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⭐ Glowing Star Beauty Contest</h1>
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
                        <p>Glowing Star Beauty Contest © 2026</p>
                        <p>glowingstar.vote | This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "text": f"Your Glowing Star Beauty Contest voting OTP is: {otp}. This code expires in 10 minutes."
        }
    
    @staticmethod
    def vote_confirmation_template(contestant_name: str, vote_count: int) -> dict:
        return {
            "subject": f"Vote Confirmed! - Glowing Star Beauty Contest",
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
                    .count {{ font-size: 48px; font-weight: bold; color: #f59e0b; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Vote Confirmed!</h1>
                    </div>
                    <div class="content">
                        <div class="vote-icon">⭐</div>
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
                        <h3 style="color: #f59e0b; font-size: 28px;">{round_name}</h3>
                        <p>Keep sharing your voting link to climb higher in the rankings!</p>
                        <p style="margin-top: 20px;"><a href="https://glowingstar.vote" style="color: #f59e0b; font-weight: bold;">Visit glowingstar.vote</a></p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "text": f"Congratulations {contestant_name}! You've qualified for {round_name} in the Glowing Star Beauty Contest!"
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
                    .header {{ background: linear-gradient(135deg, #f59e0b, #f97316); padding: 30px; text-align: center; }}
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
                        <p style="margin-top: 20px;"><a href="https://glowingstar.vote" style="color: #f59e0b; font-weight: bold;">View on glowingstar.vote</a></p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "text": f"Payment confirmed! {votes} votes ({package_name}) for ${amount:.2f} have been added."
        }
    
    @staticmethod
    def welcome_contestant_template(contestant_name: str, voting_link: str) -> dict:
        return {
            "subject": f"Welcome to Glowing Star Beauty Contest! ⭐",
            "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }}
                    .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }}
                    .header {{ background: linear-gradient(135deg, #f59e0b, #f97316); padding: 40px; text-align: center; }}
                    .header h1 {{ color: white; margin: 0; font-size: 28px; }}
                    .star {{ font-size: 60px; margin-bottom: 10px; }}
                    .content {{ padding: 30px; }}
                    .cta {{ display: inline-block; background: linear-gradient(135deg, #f59e0b, #f97316); color: white; padding: 15px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="star">⭐</div>
                        <h1>Welcome, {contestant_name}!</h1>
                    </div>
                    <div class="content">
                        <h2>You're now a Glowing Star contestant!</h2>
                        <p>Your profile is being reviewed. Once approved, you'll be able to receive votes from fans worldwide!</p>
                        <p><strong>Your voting link will be:</strong></p>
                        <p style="background: #f8fafc; padding: 15px; border-radius: 8px; word-break: break-all;">{voting_link}</p>
                        <p>Share this link on social media to get votes!</p>
                        <a href="https://glowingstar.net/portal/dashboard" class="cta">Go to Dashboard</a>
                        <p style="margin-top: 30px; color: #64748b; font-size: 14px;">Tips for success:</p>
                        <ul style="color: #64748b; font-size: 14px;">
                            <li>Complete your profile with photos</li>
                            <li>Share your voting link on Instagram, Facebook, TikTok</li>
                            <li>Engage with your supporters</li>
                        </ul>
                    </div>
                </div>
            </body>
            </html>
            """,
            "text": f"Welcome to Glowing Star Beauty Contest, {contestant_name}! Your voting link: {voting_link}. Complete your profile at glowingstar.net"
        }
    
    @staticmethod
    def profile_approved_template(contestant_name: str, voting_link: str) -> dict:
        return {
            "subject": f"🎉 Your Profile is Approved! Start Getting Votes!",
            "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }}
                    .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }}
                    .header {{ background: linear-gradient(135deg, #10b981, #059669); padding: 40px; text-align: center; }}
                    .header h1 {{ color: white; margin: 0; font-size: 28px; }}
                    .check {{ font-size: 60px; margin-bottom: 10px; }}
                    .content {{ padding: 30px; text-align: center; }}
                    .link-box {{ background: linear-gradient(135deg, #fef3c7, #ffedd5); padding: 20px; border-radius: 12px; margin: 20px 0; }}
                    .cta {{ display: inline-block; background: linear-gradient(135deg, #f59e0b, #f97316); color: white; padding: 15px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="check">✅</div>
                        <h1>Profile Approved!</h1>
                    </div>
                    <div class="content">
                        <h2>Congratulations, {contestant_name}!</h2>
                        <p>Your profile has been approved and you're now live in the contest!</p>
                        <div class="link-box">
                            <p style="margin: 0; font-weight: bold; color: #f59e0b;">Your Voting Link:</p>
                            <p style="margin: 10px 0; word-break: break-all;">{voting_link}</p>
                        </div>
                        <p>Share this link everywhere to get votes!</p>
                        <a href="{voting_link}" class="cta">View My Profile</a>
                    </div>
                </div>
            </body>
            </html>
            """,
            "text": f"Congratulations {contestant_name}! Your profile is approved. Start sharing your voting link: {voting_link}"
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

# ============ CONTEST MANAGEMENT MODELS ============

class ContestCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    entry_fee: float = 50.0
    max_participants: int = 100
    start_date: str
    end_date: str
    registration_deadline: Optional[str] = None
    voting_start_date: Optional[str] = None
    voting_end_date: Optional[str] = None
    prize_pool: float = 35000.0
    categories: Optional[List[str]] = []
    status: str = "draft"  # draft, registration, voting, completed
    rules: Optional[str] = ""

class ContestResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    entry_fee: float
    max_participants: int
    current_participants: int
    start_date: str
    end_date: str
    registration_deadline: Optional[str]
    voting_start_date: Optional[str]
    voting_end_date: Optional[str]
    prize_pool: float
    status: str
    is_voting_active: bool
    created_at: str

class EntryFeePayment(BaseModel):
    contest_id: str
    origin_url: str

class PaymentTransactionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    contestant_id: Optional[str]
    contestant_name: Optional[str]
    payment_type: str  # entry_fee, vote_package
    amount: float
    status: str  # pending, completed, failed, refunded
    stripe_session_id: Optional[str]
    created_at: str
    completed_at: Optional[str]

class RefundRequest(BaseModel):
    transaction_id: str
    reason: Optional[str] = ""

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
    """Send OTP via email using dynamic SMTP settings"""
    template = email_templates.otp_template(otp, contestant_name)
    
    # Use dynamic SMTP settings from database
    result = await send_email_smtp(email, template['subject'], template['html'], site_type="voting")
    
    if not result:
        # Log for debugging if SMTP not configured
        logging.info(f"[EMAIL] OTP email to {email} - OTP: {otp}")
    
    return result

async def send_vote_confirmation_email(email: str, contestant_name: str, vote_count: int) -> bool:
    """Send vote confirmation email using dynamic SMTP settings"""
    template = email_templates.vote_confirmation_template(contestant_name, vote_count)
    
    # Use dynamic SMTP settings from database
    result = await send_email_smtp(email, template['subject'], template['html'], site_type="voting")
    
    if not result:
        logging.info(f"[EMAIL] Vote confirmation to {email} for {contestant_name}")
    
    return result

async def send_welcome_email(email: str, full_name: str) -> bool:
    """Send welcome email to new contestant using dynamic SMTP settings"""
    template = email_templates.welcome_template(full_name)
    return await send_email_smtp(email, template['subject'], template['html'], site_type="user")

async def send_approval_email(email: str, full_name: str, voting_link: str) -> bool:
    """Send profile approval email using dynamic SMTP settings"""
    template = email_templates.profile_approved_template(full_name, voting_link)
    return await send_email_smtp(email, template['subject'], template['html'], site_type="user")

async def send_round_qualification_email(email: str, full_name: str, round_name: str) -> bool:
    """Send round qualification notification using dynamic SMTP settings"""
    template = email_templates.round_qualification_template(full_name, round_name)
    return await send_email_smtp(email, template['subject'], template['html'], site_type="user")

async def send_payment_confirmation_email(email: str, full_name: str, amount: float, votes: int, transaction_id: str) -> bool:
    """Send payment confirmation email using dynamic SMTP settings"""
    template = email_templates.payment_confirmation_template(full_name, amount, votes, transaction_id)
    return await send_email_smtp(email, template['subject'], template['html'], site_type="voting")

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
        "payment_status": "unpaid",
        "entry_fee_paid": False,
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

@api_router.delete("/rounds/{round_id}")
async def delete_round(round_id: str, admin: dict = Depends(require_admin)):
    """Delete a round (Admin only)"""
    result = await db.rounds.delete_one({"id": round_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Round not found")
    return {"success": True, "message": "Round deleted"}

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

# ============ CONTESTANT HIGHLIGHTS SYSTEM ============
# NOTE: This route MUST be defined BEFORE /contestants/{contestant_id} to avoid route conflicts

@api_router.get("/contestants/highlights")
async def get_contestant_highlights():
    """Get highlighted contestants for homepage"""
    
    # Get trending contestants (most votes in last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$contestant_id", "recent_votes": {"$sum": 1}}},
        {"$sort": {"recent_votes": -1}},
        {"$limit": 6}
    ]
    trending_ids = [doc["_id"] async for doc in db.votes.aggregate(pipeline)]
    trending = await db.contestants.find(
        {"id": {"$in": trending_ids}, "status": "approved"},
        {"_id": 0}
    ).to_list(6)
    
    # Get new contestants (joined in last 14 days)
    two_weeks_ago = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    new_contestants = await db.contestants.find(
        {"status": "approved", "created_at": {"$gte": two_weeks_ago}},
        {"_id": 0}
    ).sort("created_at", -1).limit(6).to_list(6)
    
    # Get featured contestants
    featured = await db.contestants.find(
        {"status": "approved", "is_featured": True},
        {"_id": 0}
    ).limit(6).to_list(6)
    
    # Get verified contestants
    verified = await db.contestants.find(
        {"status": "approved", "is_verified": True},
        {"_id": 0}
    ).limit(6).to_list(6)
    
    # Get rising stars (biggest vote increase in last 24 hours)
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": yesterday}}},
        {"$group": {"_id": "$contestant_id", "daily_votes": {"$sum": 1}}},
        {"$sort": {"daily_votes": -1}},
        {"$limit": 6}
    ]
    rising_ids = [doc["_id"] async for doc in db.votes.aggregate(pipeline)]
    rising = await db.contestants.find(
        {"id": {"$in": rising_ids}, "status": "approved"},
        {"_id": 0}
    ).to_list(6)
    
    return {
        "trending": trending,
        "new": new_contestants,
        "featured": featured,
        "verified": verified,
        "rising": rising
    }

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
    import stripe
    stripe.api_key = STRIPE_API_KEY
    
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
    
    try:
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'unit_amount': int(package.price * 100),  # Convert to cents
                    'product_data': {
                        'name': f"{package.name} - {package.votes} Votes",
                        'description': f"Vote package for {contestant['full_name']}",
                    },
                },
                'quantity': 1,
            }],
            mode='payment',
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
        
        # Create payment transaction record
        transaction_doc = {
            "id": str(uuid.uuid4()),
            "session_id": session.id,
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
            session_id=session.id
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str):
    """Get checkout session status and process payment if successful"""
    import stripe
    stripe.api_key = STRIPE_API_KEY
    
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
    
    try:
        # Get session status from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
        # If payment successful, add votes
        if session.payment_status == "paid" and transaction["payment_status"] != "completed":
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
            "status": session.status,
            "payment_status": session.payment_status,
            "amount": session.amount_total / 100 if session.amount_total else 0,
            "currency": session.currency or "usd"
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    import stripe
    stripe.api_key = STRIPE_API_KEY
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(body, signature, webhook_secret)
        else:
            # Parse without signature verification (dev mode)
            import json
            event = stripe.Event.construct_from(json.loads(body), stripe.api_key)
        
        if event.type == "checkout.session.completed":
            session = event.data.object
            
            if session.payment_status == "paid":
                # Process payment
                transaction = await db.payment_transactions.find_one({"session_id": session.id}, {"_id": 0})
                
                if transaction and transaction["payment_status"] != "completed":
                    await db.contestants.update_one(
                        {"id": transaction["contestant_id"]},
                        {"$inc": {"vote_count": transaction["votes"], "paid_vote_count": transaction["votes"]}}
                    )
                    
                    await db.payment_transactions.update_one(
                        {"session_id": session.id},
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
    existing = await db.users.find_one({"email": "admin@glowingstar.net"})
    if existing:
        return {"message": "Admin already exists", "email": "admin@glowingstar.net", "password": "admin123"}
    
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "email": "admin@glowingstar.net",
        "full_name": "Glowing Star Admin",
        "password": hash_password("admin123"),
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)
    return {"message": "Admin created", "email": "admin@glowingstar.net", "password": "admin123"}

# ============ SEED 50 PROFESSIONAL CONTESTANTS ============

@api_router.post("/seed/contestants")
async def seed_professional_contestants():
    """Seed 50 professional contestant profiles with realistic data"""
    
    # Professional contestant data
    contestants_data = [
        {"name": "Isabella Rodriguez", "location": "Miami, Florida, USA", "age": 24, "profession": "Fashion Model", "bio": "International runway model with 5 years of experience. Featured in Vogue and Elle magazines."},
        {"name": "Sophie Chen", "location": "Los Angeles, California, USA", "age": 22, "profession": "Actress & Model", "bio": "Rising actress and commercial model. Passionate about fitness and healthy living."},
        {"name": "Amara Williams", "location": "Atlanta, Georgia, USA", "age": 25, "profession": "Fitness Influencer", "bio": "Certified personal trainer with 500K+ followers. Advocate for body positivity."},
        {"name": "Olivia Thompson", "location": "New York City, USA", "age": 23, "profession": "Dance Instructor", "bio": "Professional dancer and choreographer. Performed on Broadway and music videos."},
        {"name": "Emma Davis", "location": "Chicago, Illinois, USA", "age": 26, "profession": "Nurse & Model", "bio": "Healthcare hero by day, aspiring model by passion. Believes in inner and outer beauty."},
        {"name": "Mia Johnson", "location": "Houston, Texas, USA", "age": 21, "profession": "College Student", "bio": "Pre-med student with a passion for pageantry. Miss Texas Teen 2023 finalist."},
        {"name": "Charlotte Brown", "location": "Phoenix, Arizona, USA", "age": 24, "profession": "Marketing Executive", "bio": "Business professional who loves fashion and photography. Former cheerleader."},
        {"name": "Ava Martinez", "location": "San Diego, California, USA", "age": 23, "profession": "Yoga Instructor", "bio": "Certified yoga teacher spreading wellness and positivity. Beach lover and surfer."},
        {"name": "Luna Garcia", "location": "San Antonio, Texas, USA", "age": 25, "profession": "Television Host", "bio": "Local TV personality with dreams of national recognition. Bilingual in English and Spanish."},
        {"name": "Chloe Wilson", "location": "Philadelphia, USA", "age": 22, "profession": "Makeup Artist", "bio": "Professional MUA with celebrity clients. Beauty content creator on YouTube."},
        {"name": "Zoe Anderson", "location": "San Jose, California, USA", "age": 24, "profession": "Software Engineer", "bio": "Tech professional breaking stereotypes. Proving beauty and brains go together."},
        {"name": "Lily Taylor", "location": "Austin, Texas, USA", "age": 23, "profession": "Music Artist", "bio": "Singer-songwriter with 2 albums released. Performing at local venues and festivals."},
        {"name": "Grace Thomas", "location": "Jacksonville, Florida, USA", "age": 26, "profession": "Real Estate Agent", "bio": "Top-selling realtor who believes confidence is the key to success."},
        {"name": "Scarlett Moore", "location": "Columbus, Ohio, USA", "age": 21, "profession": "College Athlete", "bio": "Division 1 volleyball player. Balancing sports, studies, and style."},
        {"name": "Victoria Jackson", "location": "Charlotte, NC, USA", "age": 25, "profession": "Fashion Designer", "bio": "Founder of boutique fashion line. Creating sustainable and stylish clothing."},
        {"name": "Aria White", "location": "Indianapolis, Indiana, USA", "age": 24, "profession": "Photographer", "bio": "Award-winning portrait photographer. Now stepping in front of the camera."},
        {"name": "Hannah Harris", "location": "Seattle, Washington, USA", "age": 22, "profession": "Barista & Model", "bio": "Coffee enthusiast and part-time model. Miss Washington 2024 contestant."},
        {"name": "Penelope Clark", "location": "Denver, Colorado, USA", "age": 23, "profession": "Ski Instructor", "bio": "Professional skier and outdoor enthusiast. Adventure seeker with style."},
        {"name": "Layla Lewis", "location": "Nashville, Tennessee, USA", "age": 25, "profession": "Country Singer", "bio": "Emerging country music artist. Performed at Grand Ole Opry."},
        {"name": "Riley Robinson", "location": "Boston, Massachusetts, USA", "age": 24, "profession": "Law Student", "bio": "Harvard Law student with a passion for advocacy and fashion."},
        {"name": "Zoey Walker", "location": "Portland, Oregon, USA", "age": 22, "profession": "Environmental Activist", "bio": "Fighting for climate change while representing sustainable beauty."},
        {"name": "Nora Hall", "location": "Las Vegas, Nevada, USA", "age": 26, "profession": "Casino Host", "bio": "Hospitality professional with pageant experience. Miss Nevada 2023 top 10."},
        {"name": "Stella Young", "location": "Oklahoma City, USA", "age": 23, "profession": "Flight Attendant", "bio": "Traveling the world while pursuing modeling dreams."},
        {"name": "Maya King", "location": "Louisville, Kentucky, USA", "age": 21, "profession": "Equestrian", "bio": "Professional horse rider and Kentucky Derby ambassador."},
        {"name": "Aurora Wright", "location": "Memphis, Tennessee, USA", "age": 24, "profession": "Soul Singer", "bio": "R&B vocalist carrying on Memphis music tradition."},
        {"name": "Savannah Scott", "location": "Baltimore, Maryland, USA", "age": 25, "profession": "Physical Therapist", "bio": "Healthcare professional helping others recover while pursuing passion."},
        {"name": "Brooklyn Green", "location": "Milwaukee, Wisconsin, USA", "age": 22, "profession": "Brewery Marketing", "bio": "Craft beer industry professional with a creative spirit."},
        {"name": "Paisley Adams", "location": "Albuquerque, NM, USA", "age": 23, "profession": "Art Gallery Curator", "bio": "Art enthusiast bringing culture and beauty together."},
        {"name": "Skylar Nelson", "location": "Tucson, Arizona, USA", "age": 24, "profession": "Wildlife Biologist", "bio": "Scientist and nature lover. Combining brains with natural beauty."},
        {"name": "Nova Carter", "location": "Fresno, California, USA", "age": 21, "profession": "Agricultural Student", "bio": "Farm girl with big dreams. Representing rural America."},
        {"name": "Willow Mitchell", "location": "Sacramento, California, USA", "age": 25, "profession": "State Employee", "bio": "Government professional with community service passion."},
        {"name": "Ivy Perez", "location": "Long Beach, California, USA", "age": 23, "profession": "Marine Biologist", "bio": "Ocean conservationist and scuba diving instructor."},
        {"name": "Violet Turner", "location": "Kansas City, Missouri, USA", "age": 24, "profession": "BBQ Restaurant Owner", "bio": "Entrepreneur in the food industry. Miss Kansas City 2024."},
        {"name": "Hazel Phillips", "location": "Mesa, Arizona, USA", "age": 22, "profession": "Dental Hygienist", "bio": "Creating beautiful smiles professionally and personally."},
        {"name": "Ruby Campbell", "location": "Virginia Beach, VA, USA", "age": 26, "profession": "Navy Veteran", "bio": "Served 4 years in the Navy. Now pursuing modeling career."},
        {"name": "Jade Parker", "location": "Atlanta, Georgia, USA", "age": 23, "profession": "Hip Hop Dancer", "bio": "Professional dancer featured in music videos. ATL native."},
        {"name": "Rose Evans", "location": "Colorado Springs, CO, USA", "age": 24, "profession": "Air Force Officer", "bio": "Military officer balancing service with pageant dreams."},
        {"name": "Iris Edwards", "location": "Raleigh, North Carolina, USA", "age": 21, "profession": "Tech Startup Founder", "bio": "Young entrepreneur in the tech space. Forbes 30 Under 30 nominee."},
        {"name": "Daisy Collins", "location": "Minneapolis, Minnesota, USA", "age": 25, "profession": "Ice Hockey Player", "bio": "Professional women's hockey player. Minnesota native and proud."},
        {"name": "Poppy Stewart", "location": "Tampa, Florida, USA", "age": 22, "profession": "Marine Biology Student", "bio": "USF student passionate about ocean conservation."},
        {"name": "Jasmine Sanchez", "location": "Honolulu, Hawaii, USA", "age": 24, "profession": "Hula Dancer", "bio": "Traditional Hawaiian dancer preserving island culture."},
        {"name": "Autumn Morris", "location": "Cleveland, Ohio, USA", "age": 23, "profession": "Pediatric Nurse", "bio": "Caring for children while inspiring them to dream big."},
        {"name": "Summer Rogers", "location": "New Orleans, Louisiana, USA", "age": 25, "profession": "Jazz Vocalist", "bio": "Performing in French Quarter. Miss Louisiana 2024 contestant."},
        {"name": "Winter Reed", "location": "Anchorage, Alaska, USA", "age": 21, "profession": "Wildlife Guide", "bio": "Alaska native sharing the beauty of the Last Frontier."},
        {"name": "Sierra Cook", "location": "Salt Lake City, Utah, USA", "age": 24, "profession": "Ski Resort Manager", "bio": "Outdoor enthusiast managing world-class ski resort."},
        {"name": "Meadow Morgan", "location": "Boise, Idaho, USA", "age": 22, "profession": "Organic Farmer", "bio": "Sustainable agriculture advocate. Natural beauty inside and out."},
        {"name": "River Bell", "location": "Portland, Maine, USA", "age": 23, "profession": "Lobster Boat Captain", "bio": "Third-generation lobster fisher. Maine's ocean princess."},
        {"name": "Ocean Murphy", "location": "San Francisco, CA, USA", "age": 26, "profession": "Tech Executive", "bio": "VP at major tech company. Breaking glass ceilings with grace."},
        {"name": "Storm Bailey", "location": "Oklahoma City, USA", "age": 24, "profession": "Storm Chaser", "bio": "Meteorologist and adventure seeker. Weather Channel contributor."},
        {"name": "Crystal Rivera", "location": "Miami, Florida, USA", "age": 23, "profession": "Jewelry Designer", "bio": "Creating stunning pieces while being a stunning contestant."},
    ]
    
    # Create categories if not exist
    categories = ["Fashion & Glamour", "Fitness & Sports", "Arts & Entertainment", "Professional & Business", "Nature & Adventure"]
    category_ids = {}
    
    for cat_name in categories:
        existing_cat = await db.categories.find_one({"name": cat_name})
        if existing_cat:
            category_ids[cat_name] = existing_cat["id"]
        else:
            cat_id = str(uuid.uuid4())
            await db.categories.insert_one({
                "id": cat_id,
                "name": cat_name,
                "description": f"Contestants in {cat_name} category",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            category_ids[cat_name] = cat_id
    
    # Professional placeholder photos (using picsum for variety)
    photo_urls = [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600",
        "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600",
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600",
        "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=600",
    ]
    
    created_count = 0
    
    for i, contestant in enumerate(contestants_data):
        # Check if contestant already exists
        existing = await db.contestants.find_one({"full_name": contestant["name"]})
        if existing:
            continue
        
        # Create user account
        user_id = str(uuid.uuid4())
        contestant_id = str(uuid.uuid4())
        email = contestant["name"].lower().replace(" ", ".") + "@contestant.glowingstar.net"
        
        # Determine category based on profession
        if any(x in contestant["profession"].lower() for x in ["model", "fashion", "designer"]):
            category = "Fashion & Glamour"
        elif any(x in contestant["profession"].lower() for x in ["fitness", "athlete", "trainer", "sport", "hockey", "volleyball"]):
            category = "Fitness & Sports"
        elif any(x in contestant["profession"].lower() for x in ["singer", "dancer", "artist", "actor", "music", "host"]):
            category = "Arts & Entertainment"
        elif any(x in contestant["profession"].lower() for x in ["farm", "wildlife", "nature", "ski", "outdoor", "marine", "ocean"]):
            category = "Nature & Adventure"
        else:
            category = "Professional & Business"
        
        # Create user
        await db.users.insert_one({
            "id": user_id,
            "email": email,
            "full_name": contestant["name"],
            "password": hash_password("contestant123"),
            "role": "contestant",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Generate random vote count for variety
        vote_count = random.randint(50, 5000)
        
        # Create contestant profile
        slug = contestant["name"].lower().replace(" ", "-")
        
        await db.contestants.insert_one({
            "id": contestant_id,
            "user_id": user_id,
            "full_name": contestant["name"],
            "email": email,
            "bio": contestant["bio"],
            "location": contestant["location"],
            "age": contestant["age"],
            "profession": contestant["profession"],
            "category_id": category_ids[category],
            "category_name": category,
            "photos": [photo_urls[i % len(photo_urls)]],
            "vote_count": vote_count,
            "slug": slug,
            "status": "approved",
            "is_verified": random.choice([True, False, False]),  # 33% verified
            "is_featured": random.choice([True, False, False, False]),  # 25% featured
            "social_media": {
                "instagram": f"@{slug.replace('-', '_')}",
                "twitter": f"@{slug.replace('-', '')}",
                "tiktok": f"@{slug.replace('-', '_')}"
            },
            "q_and_a": [
                {"question": "What inspired you to join this contest?", "answer": "I want to inspire others and prove that dreams can come true with hard work."},
                {"question": "What's your hidden talent?", "answer": contestant["bio"].split('.')[0]}
            ],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))).isoformat()
        })
        
        # Add some random votes for this contestant
        for _ in range(min(vote_count, 50)):  # Max 50 vote records per contestant
            await db.votes.insert_one({
                "id": str(uuid.uuid4()),
                "contestant_id": contestant_id,
                "email": f"voter{random.randint(1000,9999)}@example.com",
                "ip": f"192.168.{random.randint(1,255)}.{random.randint(1,255)}",
                "type": random.choice(["free", "free", "free", "paid"]),
                "otp_verified": True,
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 720))).isoformat()
            })
        
        created_count += 1
    
    return {
        "success": True,
        "message": f"Created {created_count} professional contestant profiles",
        "total_contestants": created_count,
        "categories_created": list(category_ids.keys())
    }

# ============ ADVANCED RATE LIMITING SYSTEM ============

class RateLimiter:
    """Smart rate limiting to prevent abuse"""
    def __init__(self):
        self.requests: Dict[str, List[datetime]] = defaultdict(list)
        self.vote_attempts: Dict[str, List[datetime]] = defaultdict(list)
    
    def clean_old_entries(self, entries: List[datetime], window_seconds: int) -> List[datetime]:
        """Remove entries older than the window"""
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
        return [e for e in entries if e > cutoff]
    
    def check_rate_limit(self, identifier: str, limit: int, window_seconds: int) -> dict:
        """Check if rate limit exceeded"""
        self.requests[identifier] = self.clean_old_entries(self.requests[identifier], window_seconds)
        
        if len(self.requests[identifier]) >= limit:
            return {
                "allowed": False,
                "reason": f"Rate limit exceeded: {limit} requests per {window_seconds}s",
                "retry_after": window_seconds
            }
        
        self.requests[identifier].append(datetime.now(timezone.utc))
        return {"allowed": True}
    
    def check_vote_limit(self, ip: str, limit: int = 10, window_seconds: int = 60) -> dict:
        """Check vote rate limit per IP per minute"""
        self.vote_attempts[ip] = self.clean_old_entries(self.vote_attempts[ip], window_seconds)
        
        if len(self.vote_attempts[ip]) >= limit:
            return {
                "allowed": False,
                "reason": f"Too many vote attempts. Max {limit} per minute.",
                "current_count": len(self.vote_attempts[ip])
            }
        
        self.vote_attempts[ip].append(datetime.now(timezone.utc))
        return {"allowed": True, "current_count": len(self.vote_attempts[ip])}

rate_limiter = RateLimiter()

# ============ ANALYTICS TRACKING SYSTEM ============

class AnalyticsTracker:
    """Track site analytics for admin dashboard"""
    
    async def track_page_view(self, request: Request, page: str):
        """Track a page view"""
        await db.analytics_pageviews.insert_one({
            "id": str(uuid.uuid4()),
            "page": page,
            "ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown"),
            "referer": request.headers.get("referer", "direct"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def track_vote(self, contestant_id: str, voter_ip: str, vote_type: str, country: str = None):
        """Track a vote for analytics"""
        await db.analytics_votes.insert_one({
            "id": str(uuid.uuid4()),
            "contestant_id": contestant_id,
            "ip": voter_ip,
            "vote_type": vote_type,
            "country": country,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def get_dashboard_stats(self, days: int = 30) -> dict:
        """Get analytics dashboard stats"""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        cutoff_str = cutoff.isoformat()
        
        # Total page views
        total_views = await db.analytics_pageviews.count_documents({
            "timestamp": {"$gte": cutoff_str}
        })
        
        # Total votes in period
        total_votes = await db.analytics_votes.count_documents({
            "timestamp": {"$gte": cutoff_str}
        })
        
        # Votes by type
        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_str}}},
            {"$group": {"_id": "$vote_type", "count": {"$sum": 1}}}
        ]
        votes_by_type = {doc["_id"]: doc["count"] async for doc in db.analytics_votes.aggregate(pipeline)}
        
        # Top traffic sources
        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_str}}},
            {"$group": {"_id": "$referer", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        traffic_sources = [{"source": doc["_id"], "count": doc["count"]} async for doc in db.analytics_pageviews.aggregate(pipeline)]
        
        # Votes by country
        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_str}, "country": {"$ne": None}}},
            {"$group": {"_id": "$country", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        votes_by_country = [{"country": doc["_id"], "count": doc["count"]} async for doc in db.analytics_votes.aggregate(pipeline)]
        
        # Daily votes trend
        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_str}}},
            {"$addFields": {"date": {"$substr": ["$timestamp", 0, 10]}}},
            {"$group": {"_id": "$date", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        daily_votes = [{"date": doc["_id"], "count": doc["count"]} async for doc in db.analytics_votes.aggregate(pipeline)]
        
        return {
            "total_page_views": total_views,
            "total_votes": total_votes,
            "votes_by_type": votes_by_type,
            "traffic_sources": traffic_sources,
            "votes_by_country": votes_by_country,
            "daily_votes_trend": daily_votes
        }

analytics = AnalyticsTracker()

# ============ DEVICE FINGERPRINT SYSTEM ============

class DeviceFingerprintTracker:
    """Track device fingerprints for fraud detection"""
    
    def generate_fingerprint(self, request: Request) -> str:
        """Generate a device fingerprint from request headers"""
        user_agent = request.headers.get("user-agent", "")
        accept_lang = request.headers.get("accept-language", "")
        accept_enc = request.headers.get("accept-encoding", "")
        ip = request.client.host if request.client else ""
        
        # Create a simple fingerprint hash
        fingerprint_str = f"{user_agent}|{accept_lang}|{accept_enc}"
        import hashlib
        return hashlib.md5(fingerprint_str.encode()).hexdigest()
    
    async def track_fingerprint(self, fingerprint: str, contestant_id: str, email: str):
        """Track a fingerprint vote"""
        await db.device_fingerprints.insert_one({
            "fingerprint": fingerprint,
            "contestant_id": contestant_id,
            "email": email,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def check_fingerprint_abuse(self, fingerprint: str, contestant_id: str) -> dict:
        """Check if fingerprint has voted too many times"""
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        
        # Count votes from this fingerprint today
        count = await db.device_fingerprints.count_documents({
            "fingerprint": fingerprint,
            "timestamp": {"$regex": f"^{today}"}
        })
        
        # Count votes for same contestant from this fingerprint
        contestant_count = await db.device_fingerprints.count_documents({
            "fingerprint": fingerprint,
            "contestant_id": contestant_id,
            "timestamp": {"$regex": f"^{today}"}
        })
        
        is_suspicious = count > 20 or contestant_count > 3
        
        return {
            "fingerprint": fingerprint,
            "total_votes_today": count,
            "votes_for_contestant": contestant_count,
            "suspicious": is_suspicious,
            "reason": "Multiple votes from same device" if is_suspicious else None
        }

fingerprint_tracker = DeviceFingerprintTracker()

# ============ CONTESTANT BADGES & VERIFICATION ============

class ContestantBadge(BaseModel):
    is_verified: bool = False
    is_featured: bool = False
    is_trending: bool = False
    is_new: bool = False
    badge_reason: Optional[str] = None

@api_router.put("/admin/contestants/{contestant_id}/badges")
async def update_contestant_badges(
    contestant_id: str,
    is_verified: bool = Query(None),
    is_featured: bool = Query(None),
    admin: dict = Depends(require_admin)
):
    """Update contestant verification/featured badges"""
    update_data = {}
    if is_verified is not None:
        update_data["is_verified"] = is_verified
    if is_featured is not None:
        update_data["is_featured"] = is_featured
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No badge updates provided")
    
    result = await db.contestants.update_one(
        {"id": contestant_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contestant not found")
    
    return {"success": True, "updated": update_data}

# ============ ADVANCED LEADERBOARD FILTERS ============

@api_router.get("/leaderboard/filtered")
async def get_filtered_leaderboard(
    filter_type: str = Query("global", enum=["global", "category", "country", "daily", "weekly"]),
    category_id: Optional[str] = None,
    country: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """Get filtered leaderboard data"""
    
    if filter_type == "global":
        # Global ranking by total votes
        contestants = await db.contestants.find(
            {"status": "approved"},
            {"_id": 0}
        ).sort("vote_count", -1).limit(limit).to_list(limit)
        
    elif filter_type == "category":
        if not category_id:
            raise HTTPException(status_code=400, detail="category_id required for category filter")
        contestants = await db.contestants.find(
            {"status": "approved", "category_id": category_id},
            {"_id": 0}
        ).sort("vote_count", -1).limit(limit).to_list(limit)
        
    elif filter_type == "country":
        if not country:
            raise HTTPException(status_code=400, detail="country required for country filter")
        contestants = await db.contestants.find(
            {"status": "approved", "location": {"$regex": country, "$options": "i"}},
            {"_id": 0}
        ).sort("vote_count", -1).limit(limit).to_list(limit)
        
    elif filter_type == "daily":
        # Top contestants by votes in last 24 hours
        yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        pipeline = [
            {"$match": {"created_at": {"$gte": yesterday}}},
            {"$group": {"_id": "$contestant_id", "daily_votes": {"$sum": 1}}},
            {"$sort": {"daily_votes": -1}},
            {"$limit": limit}
        ]
        vote_data = {doc["_id"]: doc["daily_votes"] async for doc in db.votes.aggregate(pipeline)}
        contestant_ids = list(vote_data.keys())
        contestants = await db.contestants.find(
            {"id": {"$in": contestant_ids}, "status": "approved"},
            {"_id": 0}
        ).to_list(limit)
        # Add daily_votes to each contestant
        for c in contestants:
            c["daily_votes"] = vote_data.get(c["id"], 0)
        contestants.sort(key=lambda x: x.get("daily_votes", 0), reverse=True)
        
    elif filter_type == "weekly":
        # Top contestants by votes in last 7 days
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        pipeline = [
            {"$match": {"created_at": {"$gte": week_ago}}},
            {"$group": {"_id": "$contestant_id", "weekly_votes": {"$sum": 1}}},
            {"$sort": {"weekly_votes": -1}},
            {"$limit": limit}
        ]
        vote_data = {doc["_id"]: doc["weekly_votes"] async for doc in db.votes.aggregate(pipeline)}
        contestant_ids = list(vote_data.keys())
        contestants = await db.contestants.find(
            {"id": {"$in": contestant_ids}, "status": "approved"},
            {"_id": 0}
        ).to_list(limit)
        for c in contestants:
            c["weekly_votes"] = vote_data.get(c["id"], 0)
        contestants.sort(key=lambda x: x.get("weekly_votes", 0), reverse=True)
    
    # Add rank to each contestant
    for i, c in enumerate(contestants):
        c["rank"] = i + 1
    
    return {
        "filter_type": filter_type,
        "contestants": contestants,
        "total": len(contestants)
    }

# ============ ANALYTICS API ENDPOINTS ============

@api_router.get("/admin/analytics")
async def get_analytics_dashboard(
    days: int = Query(30, le=365),
    admin: dict = Depends(require_admin)
):
    """Get comprehensive analytics dashboard data"""
    return await analytics.get_dashboard_stats(days)

@api_router.post("/analytics/pageview")
async def track_pageview(request: Request, page: str = Query(...)):
    """Track a page view (called from frontend)"""
    await analytics.track_page_view(request, page)
    return {"success": True}

# ============ GLOBAL SEARCH SYSTEM ============

@api_router.get("/search")
async def global_search(
    q: str = Query(..., min_length=2),
    search_type: str = Query("all", enum=["all", "name", "category", "country"]),
    limit: int = Query(20, le=100)
):
    """Global search for contestants"""
    query = {"status": "approved"}
    
    if search_type == "all":
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"location": {"$regex": q, "$options": "i"}},
            {"bio": {"$regex": q, "$options": "i"}}
        ]
    elif search_type == "name":
        query["full_name"] = {"$regex": q, "$options": "i"}
    elif search_type == "country":
        query["location"] = {"$regex": q, "$options": "i"}
    elif search_type == "category":
        # First find category by name
        category = await db.categories.find_one({"name": {"$regex": q, "$options": "i"}})
        if category:
            query["category_id"] = category["id"]
        else:
            return {"results": [], "total": 0, "query": q}
    
    results = await db.contestants.find(query, {"_id": 0}).limit(limit).to_list(limit)
    
    return {
        "results": results,
        "total": len(results),
        "query": q,
        "search_type": search_type
    }

# ============ CONTEST TIMELINE SYSTEM ============

@api_router.get("/contest/timeline")
async def get_contest_timeline():
    """Get contest timeline with phases"""
    rounds = await db.rounds.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Add status based on dates
    now = datetime.now(timezone.utc).isoformat()
    timeline = []
    
    for round_data in rounds:
        status = "upcoming"
        if round_data.get("start_date") and round_data["start_date"] <= now:
            status = "active" if not round_data.get("end_date") or round_data["end_date"] > now else "completed"
        
        timeline.append({
            **round_data,
            "status": status
        })
    
    # Get current active round
    active_round = next((r for r in timeline if r["status"] == "active"), None)
    
    return {
        "timeline": timeline,
        "active_round": active_round
    }

# ============ FRAUD RISK SCORE SYSTEM ============

@api_router.get("/admin/fraud-analysis/{contestant_id}")
async def get_contestant_fraud_analysis(contestant_id: str, admin: dict = Depends(require_admin)):
    """Get fraud risk analysis for a contestant"""
    
    # Get all votes for this contestant
    votes = await db.votes.find({"contestant_id": contestant_id}, {"_id": 0}).to_list(10000)
    
    # Analyze IP patterns
    ip_counts = defaultdict(int)
    email_domains = defaultdict(int)
    vote_times = []
    
    for vote in votes:
        if "ip" in vote:
            ip_counts[vote["ip"]] += 1
        if "email" in vote:
            domain = vote["email"].split("@")[-1]
            email_domains[domain] += 1
        if "created_at" in vote:
            vote_times.append(vote["created_at"])
    
    # Calculate risk factors
    risk_score = 0
    risk_factors = []
    
    # High concentration from single IP
    max_ip_votes = max(ip_counts.values()) if ip_counts else 0
    total_votes = len(votes)
    if total_votes > 10 and max_ip_votes > total_votes * 0.3:
        risk_score += 30
        risk_factors.append(f"High IP concentration: {max_ip_votes} votes from single IP")
    
    # Suspicious email domains
    suspicious_domain_votes = sum(
        count for domain, count in email_domains.items() 
        if any(x in domain.lower() for x in ['temp', 'fake', 'throw', 'disposable'])
    )
    if suspicious_domain_votes > total_votes * 0.1:
        risk_score += 25
        risk_factors.append(f"Suspicious email domains: {suspicious_domain_votes} votes")
    
    # Velocity analysis (votes too close together)
    if len(vote_times) > 5:
        sorted_times = sorted(vote_times)
        short_intervals = 0
        for i in range(1, len(sorted_times)):
            try:
                t1 = datetime.fromisoformat(sorted_times[i-1].replace('Z', '+00:00'))
                t2 = datetime.fromisoformat(sorted_times[i].replace('Z', '+00:00'))
                if (t2 - t1).total_seconds() < 10:
                    short_intervals += 1
            except:
                pass
        if short_intervals > len(vote_times) * 0.2:
            risk_score += 25
            risk_factors.append(f"Suspicious velocity: {short_intervals} rapid votes")
    
    # Many unique IPs with single vote each (potential bot farm)
    single_vote_ips = sum(1 for count in ip_counts.values() if count == 1)
    if total_votes > 50 and single_vote_ips > total_votes * 0.8:
        risk_score += 20
        risk_factors.append(f"Potential bot farm: {single_vote_ips} single-vote IPs")
    
    risk_level = "low" if risk_score < 30 else "medium" if risk_score < 60 else "high"
    
    return {
        "contestant_id": contestant_id,
        "total_votes": total_votes,
        "risk_score": min(risk_score, 100),
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "ip_analysis": {
            "unique_ips": len(ip_counts),
            "max_votes_per_ip": max_ip_votes,
            "top_ips": sorted(ip_counts.items(), key=lambda x: -x[1])[:10]
        },
        "email_analysis": {
            "unique_domains": len(email_domains),
            "top_domains": sorted(email_domains.items(), key=lambda x: -x[1])[:10]
        }
    }

# ============ HEALTH CHECK ============

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "glowing-star-contest-api", 
        "features": [
            "stripe", 
            "websocket", 
            "fraud-detection", 
            "email-templates",
            "rate-limiting",
            "analytics",
            "device-fingerprinting",
            "contestant-badges",
            "advanced-leaderboard",
            "global-search"
        ]
    }

# ============ CONTEST SETTINGS SYSTEM ============

class ContestSettings(BaseModel):
    contest_name: str = "Glowing Star Beauty Contest"
    contest_tagline: Optional[str] = "Vote for Your Favorite Star"
    contest_description: Optional[str] = None
    contest_rules: Optional[str] = None
    prize_pool: float = 35000
    prize_distribution: Optional[List[dict]] = None
    max_participants: int = 100
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    banner_image: Optional[str] = None
    logo_image: Optional[str] = None
    status: str = "active"  # draft, active, completed

@api_router.get("/contest/settings")
async def get_contest_settings():
    """Get current contest settings"""
    settings = await db.contest_settings.find_one({"active": True}, {"_id": 0})
    if not settings:
        # Return default settings - Glamour Beauty Contest
        return {
            "contest_name": "Glamour Beauty Contest 2026",
            "contest_tagline": "Where Beauty Meets Excellence",
            "contest_description": """Welcome to Glamour Beauty Contest 2026 - the world's most prestigious online beauty competition!

Join thousands of stunning contestants from around the globe as they compete for the ultimate crown and a share of our $35,000 USD prize pool.

Whether you're a professional model or an aspiring star, this is your chance to shine on the international stage. Showcase your unique beauty, gain followers, connect with industry professionals, and compete for life-changing prizes!

🌟 100 Elite Participants
🏆 $35,000 Total Prize Pool
📸 Professional Exposure
🌍 Global Recognition
💫 Brand Partnership Opportunities""",
            "contest_rules": """━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ELIGIBILITY REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Must be 18 years of age or older
• Open to all nationalities and genders
• Both professional and amateur models welcome
• Must have legal right to participate in online contests
• Valid email address required for registration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTICIPATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Submit clear, high-quality photographs
• Minimum 1 photo, maximum 5 photos allowed
• No heavy filters or excessive photo manipulation
• Professional headshots and full-body shots recommended
• Photos must be recent (within last 12 months)
• Inappropriate content will result in disqualification

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VOTING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• One FREE vote per email address every 24 hours
• Email verification (OTP) required for all votes
• Paid vote packages available for supporters
• Vote manipulation or fraud = immediate disqualification
• All votes monitored by advanced anti-fraud system
• Suspicious voting patterns will be investigated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPETITION ROUNDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Round 1: Qualification - All contestants compete
Round 2: Top 100 - Best performers advance
Round 3: Top 50 - Competition intensifies
Round 4: Top 20 - Elite contestants only
Round 5: Semi-Finals - Top 10 compete
Round 6: Grand Finals - Top 5 battle for the crown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIZE DISTRIBUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🥇 Grand Winner: $15,000 + Magazine Feature + Brand Deals
🥈 1st Runner Up: $8,000 + Photo Package + Agency Intro
🥉 2nd Runner Up: $5,000 + Photo Shoot + Sponsorship
🏅 3rd Runner Up: $4,000 + Feature + Beauty Package
🎖️ 4th Runner Up: $3,000 + Feature + Gift Package

• All prizes paid within 30 days of contest completion
• Winners must provide valid government-issued ID
• Prize money sent via bank transfer or PayPal
• Tax obligations are the responsibility of winners

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Contestants must maintain professional conduct
• No defamatory content about other participants
• Platform reserves right to disqualify rule violators
• All decisions by the judging panel are final
• By participating, you agree to our Terms of Service
• Contest organizers may use photos for promotional purposes""",
            "prize_pool": 35000,
            "prize_distribution": [
                {"position": 1, "title": "Grand Winner", "amount": 15000, "description": "$15,000 Cash + International Magazine Feature + Brand Ambassador Contract + Professional Photo Shoot Package"},
                {"position": 2, "title": "1st Runner Up", "amount": 8000, "description": "$8,000 Cash + Magazine Feature + Professional Photo Package + Modeling Agency Introduction"},
                {"position": 3, "title": "2nd Runner Up", "amount": 5000, "description": "$5,000 Cash + Online Feature + Professional Photo Shoot + Beauty Product Sponsorship"},
                {"position": 4, "title": "3rd Runner Up", "amount": 4000, "description": "$4,000 Cash + Social Media Feature + Luxury Beauty Product Package"},
                {"position": 5, "title": "4th Runner Up", "amount": 3000, "description": "$3,000 Cash + Platform Feature + Premium Gift Package"}
            ],
            "max_participants": 100,
            "status": "active",
            "active": True
        }
    return settings

@api_router.post("/admin/contest/settings")
async def create_contest_settings(settings: ContestSettings, admin: dict = Depends(require_admin)):
    """Create or update contest settings"""
    settings_dict = settings.dict()
    settings_dict["active"] = True
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings_dict["updated_by"] = admin.get("email", "admin")
    
    # Deactivate any existing settings
    await db.contest_settings.update_many({}, {"$set": {"active": False}})
    
    # Create new settings
    settings_dict["id"] = str(uuid.uuid4())
    settings_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.contest_settings.insert_one(settings_dict)
    
    # Remove _id before returning
    settings_dict.pop("_id", None)
    
    return {"success": True, "message": "Contest settings saved", "settings": settings_dict}

@api_router.put("/admin/contest/settings")
async def update_contest_settings(settings: ContestSettings, admin: dict = Depends(require_admin)):
    """Update existing contest settings"""
    existing = await db.contest_settings.find_one({"active": True})
    if not existing:
        return await create_contest_settings(settings, admin)
    
    settings_dict = settings.dict()
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings_dict["updated_by"] = admin.get("email", "admin")
    
    await db.contest_settings.update_one(
        {"active": True},
        {"$set": settings_dict}
    )
    
    updated = await db.contest_settings.find_one({"active": True}, {"_id": 0})
    return {"success": True, "message": "Contest settings updated", "settings": updated}

# ============ PROMOTIONAL BANNER SYSTEM ============

class PromoBanner(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = "Learn More"
    button_link: Optional[str] = "/portal/register"
    background_gradient: Optional[str] = "from-amber-500 via-orange-500 to-pink-500"
    is_active: bool = True
    display_type: str = "popup"  # popup, banner, fullscreen
    show_on_pages: List[str] = ["home"]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: int = 1

@api_router.get("/banners/active")
async def get_active_banners():
    """Get all active promotional banners for public display"""
    now = datetime.now(timezone.utc).isoformat()
    banners = await db.promo_banners.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("priority", -1).to_list(10)
    return banners

@api_router.get("/admin/banners")
async def get_all_banners(admin: dict = Depends(require_admin)):
    """Get all banners for admin management"""
    banners = await db.promo_banners.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return banners

@api_router.post("/admin/banners")
async def create_banner(banner: PromoBanner, admin: dict = Depends(require_admin)):
    """Create a new promotional banner"""
    banner_dict = banner.dict()
    banner_dict["id"] = str(uuid.uuid4())
    banner_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    banner_dict["created_by"] = admin.get("email", "admin")
    
    await db.promo_banners.insert_one(banner_dict)
    banner_dict.pop("_id", None)
    
    return {"success": True, "message": "Banner created successfully", "banner": banner_dict}

@api_router.put("/admin/banners/{banner_id}")
async def update_banner(banner_id: str, banner: PromoBanner, admin: dict = Depends(require_admin)):
    """Update an existing banner"""
    banner_dict = banner.dict()
    banner_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    banner_dict["updated_by"] = admin.get("email", "admin")
    
    result = await db.promo_banners.update_one(
        {"id": banner_id},
        {"$set": banner_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    updated = await db.promo_banners.find_one({"id": banner_id}, {"_id": 0})
    return {"success": True, "message": "Banner updated", "banner": updated}

@api_router.delete("/admin/banners/{banner_id}")
async def delete_banner(banner_id: str, admin: dict = Depends(require_admin)):
    """Delete a banner"""
    result = await db.promo_banners.delete_one({"id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"success": True, "message": "Banner deleted"}

@api_router.post("/admin/banners/{banner_id}/toggle")
async def toggle_banner(banner_id: str, admin: dict = Depends(require_admin)):
    """Toggle banner active status"""
    banner = await db.promo_banners.find_one({"id": banner_id})
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    new_status = not banner.get("is_active", True)
    await db.promo_banners.update_one(
        {"id": banner_id},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "is_active": new_status}

# ============ CONTEST MANAGEMENT SYSTEM ============

@api_router.post("/admin/contests")
async def create_contest(contest: ContestCreate, admin: dict = Depends(require_admin)):
    """Create a new contest"""
    contest_id = str(uuid.uuid4())
    contest_doc = contest.dict()
    contest_doc["id"] = contest_id
    contest_doc["current_participants"] = 0
    contest_doc["is_voting_active"] = False
    contest_doc["total_votes"] = 0
    contest_doc["total_payments"] = 0.0
    contest_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    contest_doc["created_by"] = admin.get("email", "admin")
    
    await db.contests.insert_one(contest_doc)
    contest_doc.pop("_id", None)
    
    return {"success": True, "message": "Contest created", "contest": contest_doc}

@api_router.get("/admin/contests")
async def get_all_contests(admin: dict = Depends(require_admin)):
    """Get all contests for admin"""
    contests = await db.contests.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Add participant counts
    for contest in contests:
        count = await db.contestants.count_documents({"contest_id": contest["id"]})
        contest["current_participants"] = count
    
    return contests

@api_router.get("/contests/active")
async def get_active_contest():
    """Get the currently active contest for public"""
    contest = await db.contests.find_one(
        {"status": {"$in": ["registration", "voting"]}},
        {"_id": 0}
    )
    if not contest:
        # Return default contest info
        return {
            "id": "default",
            "name": "Glowing Star Beauty Contest 2026",
            "entry_fee": 50.0,
            "max_participants": 100,
            "current_participants": await db.contestants.count_documents({"status": "approved"}),
            "status": "registration",
            "is_voting_active": True
        }
    
    contest["current_participants"] = await db.contestants.count_documents({
        "contest_id": contest["id"],
        "status": "approved"
    })
    return contest

@api_router.put("/admin/contests/{contest_id}")
async def update_contest(contest_id: str, contest: ContestCreate, admin: dict = Depends(require_admin)):
    """Update contest details"""
    update_dict = contest.dict()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_dict["updated_by"] = admin.get("email", "admin")
    
    result = await db.contests.update_one({"id": contest_id}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    updated = await db.contests.find_one({"id": contest_id}, {"_id": 0})
    return {"success": True, "contest": updated}

@api_router.post("/admin/contests/{contest_id}/start-voting")
async def start_voting(contest_id: str, admin: dict = Depends(require_admin)):
    """Start voting for a contest"""
    result = await db.contests.update_one(
        {"id": contest_id},
        {"$set": {
            "status": "voting",
            "is_voting_active": True,
            "voting_start_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Contest not found")
    return {"success": True, "message": "Voting started"}

@api_router.post("/admin/contests/{contest_id}/stop-voting")
async def stop_voting(contest_id: str, admin: dict = Depends(require_admin)):
    """Stop voting for a contest"""
    result = await db.contests.update_one(
        {"id": contest_id},
        {"$set": {
            "is_voting_active": False,
            "voting_end_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Contest not found")
    return {"success": True, "message": "Voting stopped"}

@api_router.post("/admin/contests/{contest_id}/complete")
async def complete_contest(contest_id: str, admin: dict = Depends(require_admin)):
    """Complete a contest and finalize results"""
    result = await db.contests.update_one(
        {"id": contest_id},
        {"$set": {
            "status": "completed",
            "is_voting_active": False,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Contest not found")
    return {"success": True, "message": "Contest completed"}

@api_router.delete("/admin/contests/{contest_id}")
async def delete_contest(contest_id: str, admin: dict = Depends(require_admin)):
    """Delete a contest (Admin only) - Only allows deletion of draft/cancelled contests"""
    contest = await db.contests.find_one({"id": contest_id})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    # Only allow deletion of draft or cancelled contests for safety
    if contest.get("status") not in ["draft", "cancelled", "completed"]:
        # For active contests, archive instead of delete
        result = await db.contests.update_one(
            {"id": contest_id},
            {"$set": {"status": "archived", "archived_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True, "message": "Contest archived (active contests cannot be deleted)"}
    
    result = await db.contests.delete_one({"id": contest_id})
    return {"success": True, "message": "Contest deleted"}

# ============ ENTRY FEE PAYMENT SYSTEM ============

@api_router.post("/payments/entry-fee")
async def create_entry_fee_checkout(request: EntryFeePayment, current_user: dict = Depends(get_current_user)):
    """Create Stripe checkout session for contest entry fee"""
    import stripe
    stripe.api_key = STRIPE_API_KEY
    
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Payment system not configured")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Get contest details
    contest = await db.contests.find_one({"id": request.contest_id}, {"_id": 0})
    if not contest:
        # Use default entry fee
        entry_fee = 50.0
        contest_name = "Glowing Star Beauty Contest 2026"
    else:
        entry_fee = contest.get("entry_fee", 50.0)
        contest_name = contest.get("name", "Glowing Star Contest")
    
    # Check if user already paid
    existing_payment = await db.entry_fee_payments.find_one({
        "user_id": user_id,
        "status": "completed"
    })
    if existing_payment:
        raise HTTPException(status_code=400, detail="Entry fee already paid")
    
    # Get contestant profile
    contestant = await db.contestants.find_one({"user_id": user_id}, {"_id": 0})
    if not contestant:
        raise HTTPException(status_code=400, detail="Please create your contestant profile first")
    
    # Get user info for email
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    user_email = user.get("email") if user else None
    user_name = user.get("full_name") if user else "Contestant"
    
    success_url = f"{request.origin_url}/portal?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/portal?payment=cancelled"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'Entry Fee - {contest_name}',
                        'description': f'Contest registration fee for {user_name}',
                    },
                    'unit_amount': int(entry_fee * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=user_email,
            metadata={
                'user_id': user_id,
                'contestant_id': contestant["id"],
                'payment_type': 'entry_fee',
                'contest_id': request.contest_id
            }
        )
        
        # Create payment record
        payment_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": user_email,
            "contestant_id": contestant["id"],
            "contestant_name": contestant.get("full_name", ""),
            "contest_id": request.contest_id,
            "payment_type": "entry_fee",
            "amount": entry_fee,
            "stripe_session_id": session.id,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.entry_fee_payments.insert_one(payment_doc)
        
        return {"checkout_url": session.url, "session_id": session.id}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/payments/entry-fee/verify/{session_id}")
async def verify_entry_fee_payment(session_id: str, current_user: dict = Depends(get_current_user)):
    """Verify entry fee payment and update contestant status"""
    import stripe
    stripe.api_key = STRIPE_API_KEY
    
    payment = await db.entry_fee_payments.find_one({"stripe_session_id": session_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] == "completed":
        return {"success": True, "status": "already_completed", "payment_status": "paid"}
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status == "paid":
            # Update payment record
            await db.entry_fee_payments.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update contestant payment status
            await db.contestants.update_one(
                {"id": payment["contestant_id"]},
                {"$set": {
                    "payment_status": "paid",
                    "entry_fee_paid": True,
                    "payment_date": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update contest payment totals
            if payment.get("contest_id"):
                await db.contests.update_one(
                    {"id": payment["contest_id"]},
                    {"$inc": {"total_payments": payment["amount"]}}
                )
            
            return {"success": True, "status": "completed", "payment_status": "paid"}
        else:
            return {"success": False, "status": "pending", "payment_status": session.payment_status}
            
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/payments/my-status")
async def get_my_payment_status(current_user: dict = Depends(get_current_user)):
    """Get current user's payment status"""
    user_id = current_user.get("user_id") or current_user.get("id")
    payment = await db.entry_fee_payments.find_one(
        {"user_id": user_id, "status": "completed"},
        {"_id": 0}
    )
    
    contestant = await db.contestants.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "has_paid": payment is not None,
        "payment": payment,
        "contestant_status": contestant.get("status") if contestant else None,
        "payment_status": contestant.get("payment_status", "unpaid") if contestant else "unpaid"
    }

# ============ ADMIN PAYMENT MANAGEMENT ============

@api_router.get("/admin/payments")
async def get_all_payments(
    status: Optional[str] = None,
    payment_type: Optional[str] = None,
    limit: int = 100,
    admin: dict = Depends(require_admin)
):
    """Get all payments with filters"""
    query = {}
    if status:
        query["status"] = status
    if payment_type:
        query["payment_type"] = payment_type
    
    # Get entry fee payments
    entry_payments = await db.entry_fee_payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Get vote package payments
    vote_payments = await db.payment_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Combine and sort
    all_payments = entry_payments + vote_payments
    all_payments.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Calculate totals
    total_entry_fees = sum(p.get("amount", 0) for p in entry_payments if p.get("status") == "completed")
    total_vote_packages = sum(p.get("amount", 0) for p in vote_payments if p.get("status") == "completed" or p.get("payment_status") == "completed")
    
    return {
        "payments": all_payments[:limit],
        "totals": {
            "entry_fees": total_entry_fees,
            "vote_packages": total_vote_packages,
            "total": total_entry_fees + total_vote_packages
        },
        "counts": {
            "entry_fee_payments": len(entry_payments),
            "vote_package_payments": len(vote_payments),
            "pending": len([p for p in all_payments if p.get("status") == "pending"]),
            "completed": len([p for p in all_payments if p.get("status") in ["completed", "paid"]])
        }
    }

@api_router.post("/admin/payments/{payment_id}/approve")
async def approve_payment(payment_id: str, admin: dict = Depends(require_admin)):
    """Manually approve a payment (for manual/offline payments)"""
    # Try entry fee payments first
    payment = await db.entry_fee_payments.find_one({"id": payment_id})
    if payment:
        await db.entry_fee_payments.update_one(
            {"id": payment_id},
            {"$set": {
                "status": "completed",
                "approved_by": admin.get("email"),
                "approved_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update contestant
        await db.contestants.update_one(
            {"id": payment["contestant_id"]},
            {"$set": {"payment_status": "paid", "entry_fee_paid": True}}
        )
        
        return {"success": True, "message": "Payment approved"}
    
    # Try vote package payments
    payment = await db.payment_transactions.find_one({"id": payment_id})
    if payment:
        await db.payment_transactions.update_one(
            {"id": payment_id},
            {"$set": {"payment_status": "completed", "approved_by": admin.get("email")}}
        )
        return {"success": True, "message": "Payment approved"}
    
    raise HTTPException(status_code=404, detail="Payment not found")

@api_router.post("/admin/payments/{payment_id}/reject")
async def reject_payment(payment_id: str, reason: Optional[str] = None, admin: dict = Depends(require_admin)):
    """Reject a payment"""
    result = await db.entry_fee_payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": "rejected",
            "rejected_by": admin.get("email"),
            "rejection_reason": reason,
            "rejected_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        await db.payment_transactions.update_one(
            {"id": payment_id},
            {"$set": {"payment_status": "rejected", "rejection_reason": reason}}
        )
    
    return {"success": True, "message": "Payment rejected"}

@api_router.post("/admin/payments/{payment_id}/refund")
async def refund_payment(payment_id: str, refund: RefundRequest, admin: dict = Depends(require_admin)):
    """Process a refund"""
    import stripe
    stripe.api_key = STRIPE_API_KEY
    
    payment = await db.entry_fee_payments.find_one({"id": payment_id})
    if not payment:
        payment = await db.payment_transactions.find_one({"id": payment_id})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") != "completed" and payment.get("payment_status") != "completed":
        raise HTTPException(status_code=400, detail="Can only refund completed payments")
    
    try:
        # Get the Stripe session to find payment intent
        session_id = payment.get("stripe_session_id") or payment.get("session_id")
        if session_id:
            session = stripe.checkout.Session.retrieve(session_id)
            if session.payment_intent:
                refund_result = stripe.Refund.create(payment_intent=session.payment_intent)
                
                # Update payment status
                collection = db.entry_fee_payments if "entry_fee" in payment.get("payment_type", "") else db.payment_transactions
                await collection.update_one(
                    {"id": payment_id},
                    {"$set": {
                        "status": "refunded",
                        "refund_id": refund_result.id,
                        "refund_reason": refund.reason,
                        "refunded_by": admin.get("email"),
                        "refunded_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Update contestant payment status if entry fee
                if payment.get("contestant_id"):
                    await db.contestants.update_one(
                        {"id": payment["contestant_id"]},
                        {"$set": {"payment_status": "refunded", "entry_fee_paid": False}}
                    )
                
                return {"success": True, "message": "Refund processed", "refund_id": refund_result.id}
        
        raise HTTPException(status_code=400, detail="Cannot process refund - no payment intent found")
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ ENHANCED USER MANAGEMENT ============

@api_router.get("/admin/users")
async def get_all_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    admin: dict = Depends(require_admin)
):
    """Get all users with their contestant info"""
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(limit)
    
    # Enrich with contestant data
    for user in users:
        contestant = await db.contestants.find_one({"user_id": user["id"]}, {"_id": 0})
        if contestant:
            user["contestant"] = {
                "id": contestant.get("id"),
                "status": contestant.get("status"),
                "payment_status": contestant.get("payment_status", "unpaid"),
                "vote_count": contestant.get("vote_count", 0),
                "slug": contestant.get("slug"),
                "category_id": contestant.get("category_id")
            }
        else:
            user["contestant"] = None
        
        # Get activity stats
        vote_count = await db.votes.count_documents({"contestant_id": user.get("id")})
        user["stats"] = {"votes_received": vote_count}
    
    return users

@api_router.put("/admin/users/{user_id}/suspend")
async def suspend_user(user_id: str, admin: dict = Depends(require_admin)):
    """Suspend a user account"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": "suspended", "suspended_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Also suspend their contestant profile
    await db.contestants.update_one(
        {"user_id": user_id},
        {"$set": {"status": "suspended"}}
    )
    
    return {"success": True, "message": "User suspended"}

@api_router.put("/admin/users/{user_id}/activate")
async def activate_user(user_id: str, admin: dict = Depends(require_admin)):
    """Reactivate a suspended user"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": "active"}, "$unset": {"suspended_at": ""}}
    )
    return {"success": True, "message": "User activated"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    """Delete a user and their contestant profile"""
    # Delete contestant profile
    await db.contestants.delete_one({"user_id": user_id})
    
    # Delete votes for this contestant
    contestant = await db.contestants.find_one({"user_id": user_id})
    if contestant:
        await db.votes.delete_many({"contestant_id": contestant["id"]})
    
    # Delete user
    await db.users.delete_one({"id": user_id})
    
    return {"success": True, "message": "User deleted"}

@api_router.put("/admin/contestants/{contestant_id}/edit")
async def admin_edit_contestant(contestant_id: str, update: ContestantUpdate, admin: dict = Depends(require_admin)):
    """Admin edit contestant profile"""
    update_dict = {k: v for k, v in update.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_dict["updated_by"] = admin.get("email")
    
    result = await db.contestants.update_one({"id": contestant_id}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Contestant not found")
    
    updated = await db.contestants.find_one({"id": contestant_id}, {"_id": 0})
    return {"success": True, "contestant": updated}

# ============ ENHANCED ADMIN STATS ============

@api_router.get("/admin/dashboard-stats")
async def get_dashboard_stats(admin: dict = Depends(require_admin)):
    """Get comprehensive dashboard statistics"""
    # Basic counts
    total_contestants = await db.contestants.count_documents({})
    approved_contestants = await db.contestants.count_documents({"status": "approved"})
    pending_contestants = await db.contestants.count_documents({"status": "pending"})
    
    # Payment stats
    paid_contestants = await db.contestants.count_documents({"payment_status": "paid"})
    unpaid_contestants = await db.contestants.count_documents({"payment_status": {"$ne": "paid"}})
    
    # Entry fee totals
    entry_fee_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    entry_fee_result = await db.entry_fee_payments.aggregate(entry_fee_pipeline).to_list(1)
    total_entry_fees = entry_fee_result[0]["total"] if entry_fee_result else 0
    
    # Vote package totals
    vote_pkg_pipeline = [
        {"$match": {"payment_status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    vote_pkg_result = await db.payment_transactions.aggregate(vote_pkg_pipeline).to_list(1)
    total_vote_packages = vote_pkg_result[0]["total"] if vote_pkg_result else 0
    
    # Votes
    total_votes = await db.votes.count_documents({})
    free_votes = await db.votes.count_documents({"vote_type": {"$ne": "paid"}})
    paid_votes = await db.votes.count_documents({"vote_type": "paid"})
    
    # Categories
    total_categories = await db.categories.count_documents({})
    
    # Active contest
    active_contest = await db.contests.find_one({"status": {"$in": ["registration", "voting"]}}, {"_id": 0})
    
    # Contest slots
    max_slots = 100
    if active_contest:
        max_slots = active_contest.get("max_participants", 100)
    
    return {
        "contestants": {
            "total": total_contestants,
            "approved": approved_contestants,
            "pending": pending_contestants,
            "paid": paid_contestants,
            "unpaid": unpaid_contestants
        },
        "payments": {
            "entry_fees_total": total_entry_fees,
            "vote_packages_total": total_vote_packages,
            "total_revenue": total_entry_fees + total_vote_packages
        },
        "votes": {
            "total": total_votes,
            "free": free_votes,
            "paid": paid_votes
        },
        "contest": {
            "active": active_contest is not None,
            "name": active_contest.get("name") if active_contest else "No active contest",
            "slots_filled": approved_contestants,
            "max_slots": max_slots,
            "status": active_contest.get("status") if active_contest else "none"
        },
        "categories": total_categories
    }

# ============ COMPETITION MANAGEMENT SYSTEM ============

class CompetitionPhase(BaseModel):
    name: str
    description: Optional[str] = None
    max_contestants: int = 100
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@api_router.post("/admin/competition/setup")
async def setup_competition(admin: dict = Depends(require_admin)):
    """Setup complete competition with all rounds"""
    
    # Clear existing rounds
    await db.rounds.delete_many({})
    
    # Create standard competition phases
    phases = [
        {"name": "Qualification Round", "description": "All contestants compete. Top 100 advance.", "max_contestants": 500, "order": 1},
        {"name": "Top 100", "description": "Top 100 contestants compete. Top 50 advance.", "max_contestants": 100, "order": 2},
        {"name": "Top 50", "description": "Top 50 contestants compete. Top 20 advance.", "max_contestants": 50, "order": 3},
        {"name": "Top 20", "description": "Top 20 contestants compete. Top 10 advance.", "max_contestants": 20, "order": 4},
        {"name": "Semi Final", "description": "Top 10 contestants compete. Top 5 advance.", "max_contestants": 10, "order": 5},
        {"name": "Grand Final", "description": "Top 5 contestants compete for the crown!", "max_contestants": 5, "order": 6},
    ]
    
    created_rounds = []
    for phase in phases:
        round_id = str(uuid.uuid4())
        round_doc = {
            "id": round_id,
            "name": phase["name"],
            "description": phase["description"],
            "max_contestants": phase["max_contestants"],
            "order": phase["order"],
            "is_active": phase["order"] == 1,  # First round is active
            "start_date": datetime.now(timezone.utc).isoformat() if phase["order"] == 1 else None,
            "end_date": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.rounds.insert_one(round_doc)
        created_rounds.append(round_doc)
    
    # Set all contestants to Qualification Round
    await db.contestants.update_many(
        {"status": "approved"},
        {"$set": {"current_round": "Qualification Round", "eliminated": False}}
    )
    
    return {
        "success": True,
        "message": "Competition setup complete",
        "rounds_created": len(created_rounds),
        "rounds": [{"name": r["name"], "max": r["max_contestants"]} for r in created_rounds]
    }

@api_router.post("/admin/competition/advance-round")
async def advance_to_next_round(admin: dict = Depends(require_admin)):
    """End current round and advance top contestants to next round"""
    
    # Get current active round
    current_round = await db.rounds.find_one({"is_active": True})
    if not current_round:
        raise HTTPException(status_code=400, detail="No active round found")
    
    # Get next round
    next_round = await db.rounds.find_one({"order": current_round["order"] + 1})
    if not next_round:
        raise HTTPException(status_code=400, detail="This is the final round. Use /complete-competition instead.")
    
    # Get top contestants by vote count
    top_contestants = await db.contestants.find(
        {"status": "approved", "eliminated": {"$ne": True}},
        {"_id": 0}
    ).sort("vote_count", -1).limit(next_round["max_contestants"]).to_list(next_round["max_contestants"])
    
    top_contestant_ids = [c["id"] for c in top_contestants]
    
    # Advance top contestants
    await db.contestants.update_many(
        {"id": {"$in": top_contestant_ids}},
        {"$set": {"current_round": next_round["name"]}}
    )
    
    # Eliminate others
    await db.contestants.update_many(
        {"status": "approved", "id": {"$nin": top_contestant_ids}, "eliminated": {"$ne": True}},
        {"$set": {"eliminated": True, "eliminated_at": current_round["name"]}}
    )
    
    # Update round status
    await db.rounds.update_one(
        {"id": current_round["id"]},
        {"$set": {"is_active": False, "status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    await db.rounds.update_one(
        {"id": next_round["id"]},
        {"$set": {"is_active": True, "status": "active", "started_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Store round results
    await db.round_results.insert_one({
        "id": str(uuid.uuid4()),
        "round_id": current_round["id"],
        "round_name": current_round["name"],
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "advanced": [{"id": c["id"], "name": c["full_name"], "votes": c["vote_count"]} for c in top_contestants],
        "eliminated_count": await db.contestants.count_documents({"eliminated_at": current_round["name"]}),
        "next_round": next_round["name"]
    })
    
    # Get eliminated count
    eliminated_count = await db.contestants.count_documents({"eliminated_at": current_round["name"]})
    
    return {
        "success": True,
        "previous_round": current_round["name"],
        "current_round": next_round["name"],
        "advanced_contestants": len(top_contestant_ids),
        "eliminated_contestants": eliminated_count,
        "top_contestants": [{"name": c["full_name"], "votes": c["vote_count"]} for c in top_contestants[:5]]
    }

# ============ PUBLIC RESULTS API ============

@api_router.get("/contest/current-round")
async def get_current_round():
    """Get current active round info for public display"""
    active_round = await db.rounds.find_one({"is_active": True}, {"_id": 0})
    if not active_round:
        # Check if there's a completed competition
        final_results = await db.competition_results.find_one({"_id": "final"}, {"_id": 0})
        if final_results:
            return {"status": "completed", "results": final_results}
        return {"status": "not_started", "message": "Contest has not started yet"}
    
    # Calculate time remaining
    end_date = active_round.get("end_date")
    time_remaining = None
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if isinstance(end_date, str) else end_date
            now = datetime.now(timezone.utc)
            if end_dt > now:
                delta = end_dt - now
                time_remaining = {
                    "days": delta.days,
                    "hours": delta.seconds // 3600,
                    "minutes": (delta.seconds % 3600) // 60,
                    "seconds": delta.seconds % 60,
                    "total_seconds": int(delta.total_seconds())
                }
        except:
            pass
    
    return {
        "status": "active",
        "round": active_round,
        "time_remaining": time_remaining
    }

@api_router.get("/contest/results")
async def get_contest_results():
    """Get all round results for public display"""
    # Get all completed rounds
    round_results = await db.round_results.find({}, {"_id": 0}).sort("completed_at", -1).to_list(100)
    
    # Get final competition results if exists
    final_results = await db.competition_results.find_one({"_id": "final"})
    
    # Get current standings
    current_standings = await db.contestants.find(
        {"status": "approved", "eliminated": {"$ne": True}},
        {"_id": 0, "id": 1, "full_name": 1, "vote_count": 1, "photos": 1, "current_round": 1}
    ).sort("vote_count", -1).limit(20).to_list(20)
    
    return {
        "round_results": round_results,
        "final_results": final_results,
        "current_standings": current_standings,
        "is_completed": final_results is not None
    }

@api_router.get("/contest/round-results/{round_name}")
async def get_round_results(round_name: str):
    """Get specific round results"""
    results = await db.round_results.find_one({"round_name": round_name}, {"_id": 0})
    if not results:
        raise HTTPException(status_code=404, detail="Round results not found")
    return results

# ============ AUTOMATIC ROUND MANAGEMENT ============

async def check_and_advance_rounds():
    """Background task to automatically check and advance rounds"""
    while True:
        try:
            # Get current active round
            active_round = await db.rounds.find_one({"is_active": True})
            if active_round and active_round.get("end_date"):
                end_date = active_round["end_date"]
                try:
                    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if isinstance(end_date, str) else end_date
                    now = datetime.now(timezone.utc)
                    
                    # If round has ended, automatically advance
                    if end_dt <= now:
                        print(f"[AUTO-ROUND] Round '{active_round['name']}' has ended. Advancing to next round...")
                        
                        # Get next round
                        next_round = await db.rounds.find_one({"order": active_round.get("order", 0) + 1})
                        
                        if next_round:
                            # Get top contestants
                            max_advance = next_round.get("max_contestants", 50)
                            top_contestants = await db.contestants.find(
                                {"status": "approved", "eliminated": {"$ne": True}},
                                {"_id": 0}
                            ).sort("vote_count", -1).limit(max_advance).to_list(max_advance)
                            
                            top_ids = [c["id"] for c in top_contestants]
                            
                            # Advance top contestants
                            await db.contestants.update_many(
                                {"id": {"$in": top_ids}},
                                {"$set": {"current_round": next_round["name"]}}
                            )
                            
                            # Eliminate others
                            await db.contestants.update_many(
                                {"status": "approved", "id": {"$nin": top_ids}, "eliminated": {"$ne": True}},
                                {"$set": {"eliminated": True, "eliminated_at": active_round["name"]}}
                            )
                            
                            # Update rounds
                            await db.rounds.update_one(
                                {"id": active_round["id"]},
                                {"$set": {"is_active": False, "status": "completed", "completed_at": now.isoformat()}}
                            )
                            await db.rounds.update_one(
                                {"id": next_round["id"]},
                                {"$set": {"is_active": True, "status": "active", "started_at": now.isoformat()}}
                            )
                            
                            # Store results
                            await db.round_results.insert_one({
                                "id": str(uuid.uuid4()),
                                "round_id": active_round["id"],
                                "round_name": active_round["name"],
                                "completed_at": now.isoformat(),
                                "advanced": [{"id": c["id"], "name": c["full_name"], "votes": c["vote_count"]} for c in top_contestants],
                                "eliminated_count": await db.contestants.count_documents({"eliminated_at": active_round["name"]}),
                                "next_round": next_round["name"],
                                "auto_advanced": True
                            })
                            
                            print(f"[AUTO-ROUND] Advanced {len(top_ids)} contestants to '{next_round['name']}'")
                        else:
                            # This is the final round - complete competition
                            print(f"[AUTO-ROUND] Final round '{active_round['name']}' ended. Completing competition...")
                            
                            # Get winners
                            winners = await db.contestants.find(
                                {"status": "approved", "eliminated": {"$ne": True}},
                                {"_id": 0}
                            ).sort("vote_count", -1).limit(10).to_list(10)
                            
                            # Store final results
                            await db.competition_results.replace_one(
                                {"_id": "final"},
                                {
                                    "_id": "final",
                                    "completed_at": now.isoformat(),
                                    "winners": [
                                        {
                                            "rank": i + 1,
                                            "id": w["id"],
                                            "name": w["full_name"],
                                            "votes": w["vote_count"],
                                            "photo": w.get("photos", [None])[0],
                                            "prize": "$15,000" if i == 0 else "$10,000" if i == 1 else "$5,000" if i == 2 else "$500"
                                        }
                                        for i, w in enumerate(winners)
                                    ],
                                    "total_votes": await db.votes.count_documents({}),
                                    "total_contestants": await db.contestants.count_documents({"status": "approved"})
                                },
                                upsert=True
                            )
                            
                            # Mark round as complete
                            await db.rounds.update_one(
                                {"id": active_round["id"]},
                                {"$set": {"is_active": False, "status": "completed", "completed_at": now.isoformat()}}
                            )
                            
                            # Update contest status
                            await db.contests.update_many(
                                {"status": "voting"},
                                {"$set": {"status": "completed", "completed_at": now.isoformat()}}
                            )
                            
                            print(f"[AUTO-ROUND] Competition completed! Winner: {winners[0]['full_name'] if winners else 'N/A'}")
                
                except Exception as e:
                    print(f"[AUTO-ROUND] Error parsing date: {e}")
        
        except Exception as e:
            print(f"[AUTO-ROUND] Error in background task: {e}")
        
        # Check every 60 seconds
        await asyncio.sleep(60)

@api_router.post("/admin/competition/complete")
async def complete_competition(admin: dict = Depends(require_admin)):
    """Complete the competition and award prizes to winners"""
    
    # Get current active round (should be Grand Final)
    current_round = await db.rounds.find_one({"is_active": True})
    
    # Get top 5 contestants (winners)
    winners = await db.contestants.find(
        {"status": "approved", "eliminated": {"$ne": True}},
        {"_id": 0}
    ).sort("vote_count", -1).limit(5).to_list(5)
    
    # Prize distribution
    prizes = [
        {"position": 1, "title": "Grand Winner", "prize_amount": 10000, "prize_description": "$10,000 + Magazine Feature + Brand Partnerships"},
        {"position": 2, "title": "1st Runner Up", "prize_amount": 5000, "prize_description": "$5,000 + Photo Shoot Package"},
        {"position": 3, "title": "2nd Runner Up", "prize_amount": 2500, "prize_description": "$2,500 + Modeling Contract"},
        {"position": 4, "title": "3rd Runner Up", "prize_amount": 1000, "prize_description": "$1,000 + Gift Package"},
        {"position": 5, "title": "4th Runner Up", "prize_amount": 500, "prize_description": "$500 + Gift Package"},
    ]
    
    awarded_winners = []
    for i, winner in enumerate(winners):
        prize = prizes[i] if i < len(prizes) else None
        if prize:
            # Update contestant with prize
            await db.contestants.update_one(
                {"id": winner["id"]},
                {"$set": {
                    "prize_position": prize["position"],
                    "prize_title": prize["title"],
                    "prize_amount": prize["prize_amount"],
                    "prize_description": prize["prize_description"],
                    "is_winner": True,
                    "won_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Add prize to wallet
            await db.wallets.update_one(
                {"user_id": winner["user_id"]},
                {
                    "$set": {"user_id": winner["user_id"], "contestant_id": winner["id"]},
                    "$inc": {"balance": prize["prize_amount"]},
                    "$push": {"transactions": {
                        "id": str(uuid.uuid4()),
                        "type": "prize",
                        "amount": prize["prize_amount"],
                        "description": f"{prize['title']} Prize - Glowing Star 2026",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }}
                },
                upsert=True
            )
            
            awarded_winners.append({
                "position": prize["position"],
                "title": prize["title"],
                "name": winner["full_name"],
                "votes": winner["vote_count"],
                "prize_amount": prize["prize_amount"],
                "prize_description": prize["prize_description"]
            })
    
    # End the current round
    if current_round:
        await db.rounds.update_one(
            {"id": current_round["id"]},
            {"$set": {"is_active": False, "end_date": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Create competition result record
    await db.competition_results.insert_one({
        "id": str(uuid.uuid4()),
        "competition_name": "Glowing Star 2026",
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "winners": awarded_winners,
        "total_contestants": await db.contestants.count_documents({"status": "approved"}),
        "total_votes": await db.votes.count_documents({})
    })
    
    return {
        "success": True,
        "message": "Competition completed! Prizes awarded to winners!",
        "winners": awarded_winners
    }

@api_router.get("/admin/competition/status")
async def get_competition_status(admin: dict = Depends(require_admin)):
    """Get current competition status"""
    
    # Get all rounds
    rounds = await db.rounds.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Get current active round
    active_round = next((r for r in rounds if r.get("is_active")), None)
    
    # Get contestant counts
    total_contestants = await db.contestants.count_documents({"status": "approved"})
    active_contestants = await db.contestants.count_documents({"status": "approved", "eliminated": {"$ne": True}})
    eliminated_contestants = await db.contestants.count_documents({"eliminated": True})
    
    # Get top 10 current contestants
    top_contestants = await db.contestants.find(
        {"status": "approved", "eliminated": {"$ne": True}},
        {"_id": 0, "id": 1, "full_name": 1, "vote_count": 1, "current_round": 1, "photos": 1}
    ).sort("vote_count", -1).limit(10).to_list(10)
    
    # Get winners if competition completed
    winners = await db.contestants.find(
        {"is_winner": True},
        {"_id": 0}
    ).sort("prize_position", 1).to_list(5)
    
    return {
        "rounds": rounds,
        "active_round": active_round,
        "total_contestants": total_contestants,
        "active_contestants": active_contestants,
        "eliminated_contestants": eliminated_contestants,
        "top_contestants": top_contestants,
        "winners": winners,
        "competition_completed": len(winners) > 0
    }

# ============ WALLET & PRIZE SYSTEM ============

@api_router.get("/contestant/wallet")
async def get_contestant_wallet(current_user: dict = Depends(get_current_user)):
    """Get contestant's wallet balance and transactions"""
    
    user_id = current_user["user_id"]
    wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    
    if not wallet:
        return {
            "balance": 0,
            "transactions": [],
            "user_id": user_id
        }
    
    return wallet

@api_router.post("/contestant/wallet/withdraw")
async def request_withdrawal(
    amount: float = Query(..., gt=0),
    payment_method: str = Query(...),
    payment_details: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Request withdrawal from wallet"""
    
    user_id = current_user["user_id"]
    wallet = await db.wallets.find_one({"user_id": user_id})
    
    if not wallet or wallet.get("balance", 0) < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create withdrawal request
    withdrawal_id = str(uuid.uuid4())
    withdrawal = {
        "id": withdrawal_id,
        "user_id": user_id,
        "amount": amount,
        "payment_method": payment_method,
        "payment_details": payment_details,
        "status": "pending",
        "requested_at": datetime.now(timezone.utc).isoformat()
    }
    await db.withdrawals.insert_one(withdrawal)
    
    # Deduct from wallet (hold)
    await db.wallets.update_one(
        {"user_id": user_id},
        {
            "$inc": {"balance": -amount, "pending_withdrawal": amount},
            "$push": {"transactions": {
                "id": str(uuid.uuid4()),
                "type": "withdrawal_pending",
                "amount": -amount,
                "description": f"Withdrawal request - {payment_method}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }}
        }
    )
    
    return {
        "success": True,
        "withdrawal_id": withdrawal_id,
        "amount": amount,
        "status": "pending",
        "message": "Withdrawal request submitted. Processing within 3-5 business days."
    }

@api_router.get("/admin/withdrawals")
async def get_withdrawal_requests(admin: dict = Depends(require_admin)):
    """Get all withdrawal requests"""
    
    withdrawals = await db.withdrawals.find({}, {"_id": 0}).sort("requested_at", -1).to_list(100)
    
    # Add contestant info
    for w in withdrawals:
        user = await db.users.find_one({"id": w["user_id"]}, {"_id": 0, "full_name": 1, "email": 1})
        if user:
            w["user_name"] = user.get("full_name", "Unknown")
            w["user_email"] = user.get("email", "Unknown")
    
    return withdrawals

@api_router.put("/admin/withdrawals/{withdrawal_id}/process")
async def process_withdrawal(
    withdrawal_id: str,
    status: str = Query(..., enum=["approved", "rejected"]),
    admin: dict = Depends(require_admin)
):
    """Process a withdrawal request"""
    
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal["status"] != "pending":
        raise HTTPException(status_code=400, detail="Withdrawal already processed")
    
    # Update withdrawal status
    await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {"status": status, "processed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if status == "rejected":
        # Refund to wallet
        await db.wallets.update_one(
            {"user_id": withdrawal["user_id"]},
            {
                "$inc": {"balance": withdrawal["amount"], "pending_withdrawal": -withdrawal["amount"]},
                "$push": {"transactions": {
                    "id": str(uuid.uuid4()),
                    "type": "withdrawal_refund",
                    "amount": withdrawal["amount"],
                    "description": "Withdrawal request rejected - funds returned",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }}
            }
        )
    else:
        # Complete the withdrawal
        await db.wallets.update_one(
            {"user_id": withdrawal["user_id"]},
            {
                "$inc": {"pending_withdrawal": -withdrawal["amount"]},
                "$push": {"transactions": {
                    "id": str(uuid.uuid4()),
                    "type": "withdrawal_complete",
                    "amount": 0,
                    "description": f"Withdrawal completed - {withdrawal['payment_method']}",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }}
            }
        )
    
    return {"success": True, "status": status, "withdrawal_id": withdrawal_id}

@api_router.get("/competition/winners")
async def get_competition_winners():
    """Get public list of competition winners"""
    
    winners = await db.contestants.find(
        {"is_winner": True},
        {"_id": 0, "id": 1, "full_name": 1, "photos": 1, "vote_count": 1, 
         "prize_position": 1, "prize_title": 1, "prize_amount": 1, "prize_description": 1,
         "location": 1, "bio": 1}
    ).sort("prize_position", 1).to_list(10)
    
    return {"winners": winners, "competition": "Glowing Star 2026"}


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

# ============ PLATFORM SETTINGS API ============

class SMTPSettings(BaseModel):
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_email: str = ""
    from_name: str = ""
    use_tls: bool = True

class PlatformSettings(BaseModel):
    # Stripe Settings
    stripe_publishable_key: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_test_mode: bool = True
    
    # SMTP Settings - Voting Site (glowingstar.vote)
    smtp_voting: SMTPSettings = SMTPSettings()
    
    # SMTP Settings - User Site (glowingstar.net)
    smtp_user: SMTPSettings = SMTPSettings()
    
    # Vote Packages
    vote_packages: List[dict] = []

@api_router.get("/admin/platform-settings")
async def get_platform_settings(current_user: dict = Depends(require_admin)):
    """Get platform settings (Admin only)"""
    settings = await db.platform_settings.find_one({"_id": "main"})
    if not settings:
        # Return default settings
        return {
            "stripe_publishable_key": "",
            "stripe_secret_key_masked": "",
            "stripe_webhook_secret_masked": "",
            "stripe_test_mode": True,
            "smtp_voting": {
                "host": "", "port": 587, "username": "", "password_set": False,
                "from_email": "noreply@glowingstar.vote", "from_name": "Glowing Star Voting", "use_tls": True
            },
            "smtp_user": {
                "host": "", "port": 587, "username": "", "password_set": False,
                "from_email": "noreply@glowingstar.net", "from_name": "Glowing Star Contest", "use_tls": True
            },
            "vote_packages": [
                {"name": "Starter Pack", "votes": 10, "price": 500, "popular": False},
                {"name": "Support Pack", "votes": 50, "price": 2000, "popular": True},
                {"name": "Champion Pack", "votes": 100, "price": 3500, "popular": False},
                {"name": "Ultimate Pack", "votes": 500, "price": 15000, "popular": False},
            ]
        }
    
    # Mask sensitive data
    return {
        "stripe_publishable_key": settings.get("stripe_publishable_key", ""),
        "stripe_secret_key_masked": "••••••" + settings.get("stripe_secret_key", "")[-4:] if settings.get("stripe_secret_key") else "",
        "stripe_webhook_secret_masked": "••••••" + settings.get("stripe_webhook_secret", "")[-4:] if settings.get("stripe_webhook_secret") else "",
        "stripe_test_mode": settings.get("stripe_test_mode", True),
        "smtp_voting": {
            **settings.get("smtp_voting", {}),
            "password_set": bool(settings.get("smtp_voting", {}).get("password"))
        },
        "smtp_user": {
            **settings.get("smtp_user", {}),
            "password_set": bool(settings.get("smtp_user", {}).get("password"))
        },
        "vote_packages": settings.get("vote_packages", [])
    }

@api_router.put("/admin/platform-settings")
async def update_platform_settings(settings: dict, current_user: dict = Depends(require_admin)):
    """Update platform settings (Admin only)"""
    # Get existing settings
    existing = await db.platform_settings.find_one({"_id": "main"}) or {}
    
    # Update settings (preserve passwords if not provided)
    update_data = {
        "_id": "main",
        "stripe_publishable_key": settings.get("stripe_publishable_key", existing.get("stripe_publishable_key", "")),
        "stripe_test_mode": settings.get("stripe_test_mode", existing.get("stripe_test_mode", True)),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Only update secret key if provided and not masked
    if settings.get("stripe_secret_key") and not settings["stripe_secret_key"].startswith("••"):
        update_data["stripe_secret_key"] = settings["stripe_secret_key"]
    else:
        update_data["stripe_secret_key"] = existing.get("stripe_secret_key", "")
    
    if settings.get("stripe_webhook_secret") and not settings["stripe_webhook_secret"].startswith("••"):
        update_data["stripe_webhook_secret"] = settings["stripe_webhook_secret"]
    else:
        update_data["stripe_webhook_secret"] = existing.get("stripe_webhook_secret", "")
    
    # SMTP Voting Site
    smtp_voting = settings.get("smtp_voting", {})
    existing_smtp_voting = existing.get("smtp_voting", {})
    update_data["smtp_voting"] = {
        "host": smtp_voting.get("host", existing_smtp_voting.get("host", "")),
        "port": smtp_voting.get("port", existing_smtp_voting.get("port", 587)),
        "username": smtp_voting.get("username", existing_smtp_voting.get("username", "")),
        "password": smtp_voting.get("password", existing_smtp_voting.get("password", "")) if smtp_voting.get("password") else existing_smtp_voting.get("password", ""),
        "from_email": smtp_voting.get("from_email", existing_smtp_voting.get("from_email", "noreply@glowingstar.vote")),
        "from_name": smtp_voting.get("from_name", existing_smtp_voting.get("from_name", "Glowing Star Voting")),
        "use_tls": smtp_voting.get("use_tls", existing_smtp_voting.get("use_tls", True)),
    }
    
    # SMTP User Site
    smtp_user = settings.get("smtp_user", {})
    existing_smtp_user = existing.get("smtp_user", {})
    update_data["smtp_user"] = {
        "host": smtp_user.get("host", existing_smtp_user.get("host", "")),
        "port": smtp_user.get("port", existing_smtp_user.get("port", 587)),
        "username": smtp_user.get("username", existing_smtp_user.get("username", "")),
        "password": smtp_user.get("password", existing_smtp_user.get("password", "")) if smtp_user.get("password") else existing_smtp_user.get("password", ""),
        "from_email": smtp_user.get("from_email", existing_smtp_user.get("from_email", "noreply@glowingstar.net")),
        "from_name": smtp_user.get("from_name", existing_smtp_user.get("from_name", "Glowing Star Contest")),
        "use_tls": smtp_user.get("use_tls", existing_smtp_user.get("use_tls", True)),
    }
    
    # Vote packages
    if settings.get("vote_packages"):
        update_data["vote_packages"] = settings["vote_packages"]
    else:
        update_data["vote_packages"] = existing.get("vote_packages", [])
    
    await db.platform_settings.replace_one({"_id": "main"}, update_data, upsert=True)
    
    # Update global Stripe key if provided
    global STRIPE_API_KEY
    if update_data.get("stripe_secret_key"):
        STRIPE_API_KEY = update_data["stripe_secret_key"]
    
    return {"success": True, "message": "Settings updated successfully"}

@api_router.post("/admin/test-smtp")
async def test_smtp_connection(data: dict, current_user: dict = Depends(require_admin)):
    """Test SMTP connection (Admin only)"""
    site_type = data.get("site_type", "voting")  # "voting" or "user"
    test_email = data.get("test_email", current_user.get("email"))
    
    # Get settings from DB
    settings = await db.platform_settings.find_one({"_id": "main"})
    if not settings:
        raise HTTPException(status_code=400, detail="Platform settings not configured")
    
    smtp_config = settings.get(f"smtp_{site_type}", {})
    
    if not smtp_config.get("host") or not smtp_config.get("username"):
        raise HTTPException(status_code=400, detail=f"SMTP settings for {site_type} site not configured")
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = f"{smtp_config.get('from_name', 'Glowing Star')} <{smtp_config.get('from_email', '')}>"
        msg['To'] = test_email
        msg['Subject'] = "Glowing Star - SMTP Test Email"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #ec4899;">✨ SMTP Test Successful!</h2>
            <p>This is a test email from your Glowing Star platform.</p>
            <p><strong>Site:</strong> {site_type.title()} Site</p>
            <p><strong>SMTP Host:</strong> {smtp_config.get('host')}</p>
            <p><strong>From:</strong> {smtp_config.get('from_email')}</p>
            <p style="color: #22c55e;">Your email configuration is working correctly! 🎉</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        
        # Connect and send
        if smtp_config.get("use_tls", True):
            server = smtplib.SMTP(smtp_config["host"], smtp_config.get("port", 587))
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp_config["host"], smtp_config.get("port", 465))
        
        server.login(smtp_config["username"], smtp_config["password"])
        server.sendmail(smtp_config["from_email"], test_email, msg.as_string())
        server.quit()
        
        return {"success": True, "message": f"Test email sent to {test_email}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMTP Error: {str(e)}")

# Helper function to send emails via SMTP
async def send_email_smtp(to_email: str, subject: str, html_body: str, site_type: str = "voting"):
    """Send email via SMTP"""
    settings = await db.platform_settings.find_one({"_id": "main"})
    
    if not settings:
        print(f"[EMAIL] No platform settings - logging email to console")
        print(f"[EMAIL] To: {to_email}, Subject: {subject}")
        return False
    
    smtp_config = settings.get(f"smtp_{site_type}", {})
    
    if not smtp_config.get("host") or not smtp_config.get("password"):
        print(f"[EMAIL] SMTP not configured for {site_type} - logging to console")
        print(f"[EMAIL] To: {to_email}, Subject: {subject}")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{smtp_config.get('from_name', 'Glowing Star')} <{smtp_config.get('from_email', '')}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html'))
        
        if smtp_config.get("use_tls", True):
            server = smtplib.SMTP(smtp_config["host"], smtp_config.get("port", 587))
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp_config["host"], smtp_config.get("port", 465))
        
        server.login(smtp_config["username"], smtp_config["password"])
        server.sendmail(smtp_config["from_email"], to_email, msg.as_string())
        server.quit()
        
        print(f"[EMAIL] Sent successfully to {to_email}")
        return True
    
    except Exception as e:
        print(f"[EMAIL] Failed to send: {str(e)}")
        return False
