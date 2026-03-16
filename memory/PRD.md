# Glowing Star - Premium Beauty Contest Platform

## Original Problem Statement
Build a premium, high-class online voting contest platform inspired by mshealthandfit.com with:
1. **Admin Panel**: Master dashboard for website owner to manage contestants, approve profiles, manage contest rounds, monitor votes in real-time, block fake voters, manage leaderboard, and control contest settings
2. **User Panel (Contestant Dashboard)**: Portal for participants to register, login, upload photos, add personal information, submit application, view vote statistics, and get unique public voting link
3. **Public Voting Panel**: Public-facing website where visitors can view contestant profiles, see leaderboard, and vote

### Core Voting Rules
- 1 email address = 1 vote every 24 hours (free votes)
- Votes verified via email OTP system
- Paid votes available via Stripe

### Domain Architecture
- **glowingstar.vote** - Public voting domain (NO "Join Contest" button)
- **glowingstar.net** - Management portal domain (Admin + Contestant Dashboard)

---

## Completed Features

### ✅ Rebranding (Dec 16, 2025)
- Changed project name from "Glamour" to "Glowing Star"
- Applied gold/amber theme throughout the application
- Updated favicon with gold star icon
- Updated all text references and color schemes

### ✅ Two-Domain Architecture (Dec 16, 2025)
- Public Site: Homepage, Contestants, Leaderboard, Voting pages
- Management Portal: Admin Panel, Contestant Dashboard, Login/Register
- Public site has "Contestant Login" external link (no "Join Contest")
- Management portal accessible at /portal/* routes

### ✅ Mobile Responsive Design (Dec 16, 2025)
- All pages fully responsive for mobile, tablet, desktop
- Hamburger menu for mobile navigation
- Optimized grid layouts for smaller screens
- Touch-friendly buttons and inputs

### ✅ Full WebSocket Integration (Dec 16, 2025)
- Real-time vote updates on HomePage, LeaderboardPage, VotingPage
- Admin Panel receives live vote notifications
- Contestant Dashboard shows live vote count updates
- WebSocket hooks: useWebSocket, useVoteUpdates, useLeaderboardUpdates

### ✅ Email Notification Templates (Dec 16, 2025)
- OTP verification template
- Vote confirmation template
- Round qualification template
- Payment confirmation template
- Welcome contestant template
- Profile approved template

### ✅ Advanced Admin Panel
- Dashboard with real-time stats and charts
- Contestant management (approve/reject/edit)
- Category management (CRUD)
- Round management (create, activate, end)
- Vote monitoring with fraud detection
- Dark luxury Web3 design

### ✅ Advanced Contestant Dashboard
- Profile management with photo uploads
- Vote statistics and analytics
- Unique voting link with copy button
- Social media integration
- Q&A section management
- Light premium Web3 design

### ✅ Public Voting Interface
- Professional homepage with hero section
- Contestant gallery with filters and search
- Individual voting pages with paid vote options
- Live leaderboard with podium display
- Countdown timer for round endings

### ✅ Stripe Integration
- Vote packages (10, 50, 100 votes)
- Secure checkout flow
- Payment success handling
- Transaction recording

### ✅ Fraud Detection
- Duplicate vote detection
- IP-based rate limiting
- Email pattern analysis
- Admin vote review interface

---

## Architecture

```
/app
├── backend/
│   ├── server.py          # FastAPI with all endpoints
│   ├── requirements.txt   # Python dependencies
│   └── .env              # MongoDB, JWT, Stripe config
└── frontend/
    ├── src/
    │   ├── App.js         # Router (public vs portal)
    │   ├── components/
    │   │   ├── Layout.jsx # Header/Footer
    │   │   └── ui/        # Shadcn components
    │   ├── pages/
    │   │   ├── HomePage.jsx
    │   │   ├── ContestantsPage.jsx
    │   │   ├── LeaderboardPage.jsx
    │   │   ├── VotingPage.jsx
    │   │   └── portal/
    │   │       ├── AdminPanel.jsx
    │   │       ├── ContestantDashboard.jsx
    │   │       ├── PortalLogin.jsx
    │   │       └── PortalRegister.jsx
    │   ├── hooks/
    │   │   └── useWebSocket.js
    │   └── context/
    │       └── AuthContext.js
    └── public/
        └── index.html
```

---

## Database Schema

### users
```json
{
  "id": "uuid",
  "email": "string",
  "password": "hashed",
  "full_name": "string",
  "role": "admin | contestant",
  "created_at": "datetime"
}
```

### contestants
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "full_name": "string",
  "bio": "string",
  "photos": ["url"],
  "status": "pending | approved | rejected",
  "vote_count": "int",
  "slug": "string",
  "category_id": "uuid",
  "location": "string",
  "social_media": {},
  "q_and_a": []
}
```

### votes
```json
{
  "id": "uuid",
  "contestant_id": "uuid",
  "email": "string",
  "type": "free | paid",
  "timestamp": "datetime",
  "otp_verified": "boolean"
}
```

---

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Contestants
- GET /api/contestants
- GET /api/contestants/:slug
- POST /api/contestants (create profile)
- PUT /api/contestants/:id

### Voting
- POST /api/votes/initiate
- POST /api/votes/verify
- GET /api/votes/packages
- POST /api/votes/checkout

### Admin
- GET /api/admin/stats
- GET /api/admin/votes
- PUT /api/admin/contestants/:id/status
- POST /api/admin/contestants/:id/block

### WebSocket
- /ws/votes - Global vote updates
- /ws/leaderboard - Leaderboard updates
- /ws/contestant/:id - Specific contestant updates

---

## Pending/Backlog

### P1 - High Priority
- [ ] Cloud Storage Integration (AWS S3) for contestant photos
- [ ] Real SendGrid email integration (currently MOCKED)

### P2 - Medium Priority
- [ ] Social sharing buttons with OG meta tags
- [ ] Photo gallery lightbox
- [ ] Advanced analytics dashboard

### P3 - Low Priority
- [ ] Multi-language support
- [ ] Contest winner announcement page
- [ ] Certificate generation

---

## Test Credentials
- **Admin**: admin@glowingstar.net / admin123

## Mocked Services
- ⚠️ Email OTP: `send_otp_email` function is mocked (logs to console)
