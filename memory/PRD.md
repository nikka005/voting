# Glamour - Premium Online Voting Contest Platform

## Original Problem Statement
Build a premium, high-class online voting contest platform inspired by mshealthandfit.com with three distinct panels:
1. **Admin Panel** (Backbone) - Master dashboard for contest management
2. **User Panel** (Contestant Dashboard) - Participants manage profiles
3. **Public Voting Panel** - Public-facing voting website

## Product Requirements

### Core Features
- **Voting System**: 1 email = 1 vote per 24 hours, verified via email OTP
- **Email System**: SendGrid for OTP (currently MOCKED)
- **Design**: Premium, modern, Web3-style design

### Three-Panel Architecture
1. **Admin Panel** (`/admin` or `/backbone`) - Dark luxury Web3 theme
2. **Contestant Dashboard** (`/dashboard`) - Light colorful theme
3. **Public Voting** (`/`, `/contestants`, `/leaderboard`, `/:year/:slug`) - Light Web3 theme

---

## What's Been Implemented

### Backend (FastAPI)
- [x] JWT Authentication (register, login, me)
- [x] User management (admin, contestant roles)
- [x] Contestant CRUD with status management
- [x] Category CRUD with contestant counts
- [x] Round management with activation
- [x] Voting system with OTP (MOCKED email)
- [x] 24-hour vote limiting
- [x] Leaderboard API with filtering
- [x] Admin statistics endpoint

### Frontend (React + Tailwind)

#### Public Panel (Light Theme)
- [x] HomePage - Hero section, top contestants, categories
- [x] ContestantsPage - Browse all approved contestants
- [x] LeaderboardPage - Real-time rankings
- [x] VotingPage - Individual contestant voting with:
  - Photo gallery
  - Vote button with OTP modal
  - Countdown timer
  - Prize banner
  - Q&A section
  - Social sharing
  - Paid vote placeholders

#### Contestant Dashboard (Light Theme)
- [x] Profile management
- [x] Photo upload/delete
- [x] Q&A section management
- [x] Stats cards (votes, status, link)

#### Admin Panel (Dark Luxury Web3 Theme) ✅ NEW
- [x] **Dashboard** - Real-time stats, top contestants, recent votes
- [x] **Contests** - Category & round management
- [x] **Contestants** - Full management table with search/filter
- [x] **Voting** - Vote controls and activity feed
- [x] **Leaderboard** - Multiple leaderboard types
- [x] **Media** - Photo gallery management
- [x] **Security** - Security features status and fraud detection
- [x] **Reports** - Export options (CSV, Excel, PDF placeholders)
- [x] **Settings** - Platform configuration

### Design Features
- Dark luxury theme for Admin (glassmorphism, neon accents)
- Light colorful Web3 theme for public pages
- Responsive design
- Gradient stat cards
- Smooth animations

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register contestant
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

### Rounds
- `GET /api/rounds` - List rounds
- `POST /api/rounds` - Create round (admin)
- `PUT /api/rounds/:id` - Update round (admin)
- `POST /api/rounds/:id/activate` - Activate round (admin)

### Contestants
- `GET /api/contestants` - List contestants with filters
- `GET /api/contestants/:id` - Get contestant by ID
- `GET /api/contestants/slug/:year/:slug` - Get by slug
- `GET /api/contestants/me/profile` - Get own profile
- `PUT /api/contestants/me/profile` - Update own profile
- `POST /api/contestants/me/photos` - Upload photo
- `DELETE /api/contestants/me/photos/:index` - Delete photo

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/votes` - Vote analytics
- `PUT /api/admin/contestants/:id/status` - Update status
- `PUT /api/admin/contestants/:id/round` - Assign round
- `DELETE /api/admin/contestants/:id` - Delete contestant

### Voting
- `POST /api/vote/request-otp` - Request OTP
- `POST /api/vote/verify` - Verify and cast vote

### Leaderboard
- `GET /api/leaderboard` - Get rankings

---

## Database Schema (MongoDB)

### users
```
{id, email, password_hash, full_name, phone, role, created_at}
```

### contestants
```
{id, user_id, full_name, email, slug, bio, photos[], 
 social_instagram, social_facebook, social_twitter, social_tiktok,
 age, location, category_id, vote_count, status, round, qa_items[], created_at}
```

### categories
```
{id, name, description, is_active, created_at}
```

### rounds
```
{id, name, description, max_contestants, start_date, end_date, is_active, order, created_at}
```

### votes
```
{id, email, contestant_id, created_at}
```

### otps
```
{id, email, contestant_id, otp, used, created_at, expires_at}
```

---

## Pending/Blocked Items

### P0 - High Priority
- [ ] **Testing** - Comprehensive end-to-end testing needed
- [ ] **Email OTP** - Currently MOCKED, needs SendGrid integration

### P1 - Medium Priority
- [ ] Cloud storage for contestant photos (currently base64)
- [ ] Reduce spacing across pages (partially done)

### P2 - Future Features
- [ ] Paid voting system (Stripe integration)
- [ ] Two-domain architecture separation
- [ ] Real-time vote updates via WebSocket
- [ ] Advanced fraud detection algorithms
- [ ] Email notification templates

---

## Admin Credentials
- Email: `admin@lumina.com`
- Password: `admin123`

---

## Tech Stack
- **Backend**: FastAPI, PyMongo, JWT, bcrypt
- **Frontend**: React, React Router, Tailwind CSS, Axios
- **Database**: MongoDB
- **Deployment**: Kubernetes container with Supervisor

---

## File Structure
```
/app
├── backend/
│   ├── .env
│   ├── requirements.txt
│   └── server.py
└── frontend/
    ├── .env
    ├── package.json
    └── src/
        ├── App.js
        ├── index.css
        ├── context/AuthContext.js
        ├── lib/api.js, utils.js
        ├── components/
        │   ├── Layout.jsx
        │   ├── ContestantCard.jsx
        │   ├── VotingModal.jsx
        │   └── ui/ (shadcn components)
        └── pages/
            ├── HomePage.jsx
            ├── VotingPage.jsx
            ├── ContestantsPage.jsx
            ├── LeaderboardPage.jsx
            ├── ContestantDashboard.jsx
            ├── AdminPanel.jsx (NEW - Dark Theme)
            ├── LoginPage.jsx
            └── RegisterPage.jsx
```
