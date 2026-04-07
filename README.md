# Aura-Audit — AI-Powered Career Intelligence Platform

> **Audit the past. Engineer your future.**

Aura-Audit is a full-stack AI career platform that audits resumes with Gemini 1.5 Flash, assigns a multi-dimensional **Aura Score**, and connects students, companies, and universities in a unified career ecosystem.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-aura--audit--app.vercel.app-7C3AED?style=for-the-badge&logo=vercel)](https://aura-audit-app.vercel.app)
[![Backend](https://img.shields.io/badge/API-Railway-0B0D0E?style=for-the-badge&logo=railway)](https://server-production-bc09.up.railway.app)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Render-46E3B7?style=for-the-badge&logo=render)](https://aura-audit-ai.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-SagarSwain05%2FAura--Audit-181717?style=for-the-badge&logo=github)](https://github.com/SagarSwain05/Aura-Audit)

---

## Live URLs

| Service | URL | Platform |
|---------|-----|----------|
| **Frontend** | https://aura-audit-app.vercel.app | Vercel |
| **Backend API** | https://server-production-bc09.up.railway.app | Railway |
| **AI Engine** | https://aura-audit-ai.onrender.com | Render (free tier) |
| **Database** | MongoDB Atlas (aura-audit-db cluster) | Atlas |

> **Note:** The AI engine runs on Render's free tier and may take ~30s to wake up on the first request after 15 minutes of inactivity.

---

## Project Status

| Module | Status |
|--------|--------|
| Resume Upload & Audit | ✅ Live |
| Aura Score (multi-dimensional) | ✅ Live |
| Redlines (AI Grammarly-style) | ✅ Live |
| Career Matcher | ✅ Live |
| Gap Analysis + Roadmap | ✅ Live |
| Interview Simulator | ✅ Live |
| Market Demand Pulse | ✅ Live |
| Blind Hiring Mode | ✅ Live |
| Student Dashboard (all pages) | ✅ Live |
| Company Dashboard | ✅ Live |
| University/TPO Dashboard | ✅ Live |
| Real-Time Notifications (Socket.IO) | ✅ Live |
| Career Points & Gamification | ✅ Live |
| Leaderboard | ✅ Live |
| Live Job Board | ✅ Live |
| AI Assessments | ✅ Live |
| Resume Builder | ✅ Live |
| Dark / Light Theme | ✅ Live |
| Role-Based Auth (Student/Company/TPO) | ✅ Live |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Vercel)                    │
│              Next.js 15 + Tailwind CSS v3               │
│   Student │ Company │ University │ Public Landing Page   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / WebSocket (Socket.IO)
┌──────────────────────▼──────────────────────────────────┐
│                   BACKEND API (Railway)                  │
│           Node.js + Express.js + Socket.IO              │
│  Auth · Audit · Student · Company · TPO · Jobs · Notifs │
└────────────┬──────────────────────────┬─────────────────┘
             │ Mongoose                 │ HTTP (axios)
┌────────────▼──────────┐   ┌──────────▼──────────────────┐
│   MongoDB Atlas        │   │     AI Engine (Render)       │
│  10+ collections      │   │   FastAPI + Python 3.11      │
│  Career data, Audits,  │   │   Gemini 1.5 Flash API       │
│  Notifications, Jobs  │   │   PyMuPDF · Gemini Embeddings│
└───────────────────────┘   └─────────────────────────────┘
                                         │
                             ┌───────────▼───────────┐
                             │    Cloudinary (CDN)    │
                             │  PDF storage & delivery│
                             └───────────────────────┘
```

---

## Tech Stack

### Frontend
| Tool | Purpose |
|------|---------|
| **Next.js 15** (App Router) | SSR + Client Components |
| **TypeScript** | Type safety across all pages |
| **Tailwind CSS v3** | Utility-first styling with custom design tokens |
| **Framer Motion** | Scroll-triggered animations |
| **Zustand** | Global state (auth, audit, roadmap) |
| **Socket.IO Client** | Real-time notifications |
| **Axios** | API calls with JWT interceptor |
| **react-hot-toast** | Toast notifications |
| **react-dropzone** | Resume upload UI |

### Backend
| Tool | Purpose |
|------|---------|
| **Node.js + Express.js** | REST API server |
| **Socket.IO** | Real-time WebSocket events |
| **MongoDB + Mongoose** | Database & ODM |
| **JWT** | Stateless authentication |
| **Cloudinary** | PDF file storage |
| **Multer** | File upload middleware |
| **bcrypt** | Password hashing |
| **axios** | HTTP calls to AI engine |

### AI Engine
| Tool | Purpose |
|------|---------|
| **FastAPI** | High-performance Python API |
| **Google Gemini 1.5 Flash** | Resume audit, Q&A, roadmap generation |
| **Gemini text-embedding-004** | Semantic skill embeddings (replaces sentence-transformers) |
| **PyMuPDF (fitz)** | PDF text extraction |
| **Uvicorn** | ASGI server |

### Infrastructure
| Service | Role |
|---------|------|
| **Vercel** | Frontend hosting + CI/CD |
| **Railway** | Backend API hosting |
| **Render** | AI engine hosting (free tier) |
| **MongoDB Atlas** | Managed database |
| **Cloudinary** | Resume PDF CDN |

---

## Features

### For Students
- **AI Resume Audit** — Gemini-powered Grammarly-style redlines with severity levels (critical / warning / suggestion)
- **Aura Score** — Multi-dimensional 0–100 score: Technical Density, Impact Quotient, Formatting Health, ATS Compatibility
- **Career Matcher** — Semantic skill-to-role matching with salary bands and fit percentage
- **Gap Analysis** — Skills you're missing for your dream role, with curated resources
- **30-Day Roadmap** — Auto-generated learning roadmap with YouTube & Coursera links
- **Interview Simulator** — 5 tailored AI questions based on your actual projects
- **Market Demand Pulse** — Live hiring temperature for your skills across global cities
- **Blind Hiring Mode** — Strips name, gender, and location before analysis
- **Career Readiness Score** — Composite score tracking skills, certs, projects, CGPA
- **Career Points & Leaderboard** — Gamification: earn points for audits, skills, certs
- **Skills Tracker** — Add, update, and level up skills (beginner → expert)
- **Live Job Board** — Browse and one-click apply to live job postings
- **AI Assessments** — Proctored skill tests with AI evaluation
- **Resume Builder** — AI-assisted resume creation from scratch
- **Real-Time Notifications** — Socket.IO push notifications for audit results, assessment scores
- **Analytics Dashboard** — Career progress graphs and activity tracking

### For Companies
- **AI Candidate Matching** — Rank candidates by Aura Score and role fit percentage
- **Job Posting & Management** — Create and manage job listings with custom requirements
- **Talent Pipeline** — Track candidates through hiring stages
- **Hiring Analytics** — Application funnel, shortlist rates, hiring trends
- **KYC Verification** — Company identity verification workflow
- **Blind Hiring Compliance** — Access blind-screened candidate profiles

### For Universities (TPO)
- **Placement Tracker** — Real-time placement rate by department and batch
- **Employability Reports** — Batch-level career readiness analytics
- **Student Monitoring** — Track every student's audit history, skills, and applications
- **At-Risk Alerts** — Intervention system for students with low career readiness scores
- **Company Connection Hub** — Manage recruiter relationships and drive-scheduling
- **Bulk Resume Upload** — Upload and audit multiple resumes at once
- **Assessment Management** — Create and assign college-wide skill assessments
- **Year-on-Year Trends** — Placement outcome comparisons across academic years

---

## Project Structure

```
Aura-Audit/
├── client/                      # Next.js 15 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── auth/             # Login + Register (role-based)
│   │   │   ├── upload/           # Resume upload
│   │   │   ├── audit/[id]/       # Audit results page
│   │   │   ├── dashboard/        # User audit history
│   │   │   ├── roadmap/          # Career roadmap viewer
│   │   │   ├── student/          # Student dashboard (10+ pages)
│   │   │   │   ├── home/         # Career readiness overview
│   │   │   │   ├── jobs/         # Job board
│   │   │   │   ├── assessments/  # Skill assessments
│   │   │   │   ├── leaderboard/  # Points leaderboard
│   │   │   │   ├── skills/       # Skills manager
│   │   │   │   ├── career/       # Career matcher
│   │   │   │   ├── analytics/    # Progress charts
│   │   │   │   ├── notifications/# Notification center
│   │   │   │   ├── profile/      # Student profile
│   │   │   │   └── resume-builder/
│   │   │   ├── company/          # Company dashboard (8 pages)
│   │   │   │   ├── home/         # Hiring overview
│   │   │   │   ├── jobs/         # Job management
│   │   │   │   ├── candidates/   # Candidate pool
│   │   │   │   ├── pipeline/     # Hiring pipeline
│   │   │   │   ├── ai-match/     # AI matching engine
│   │   │   │   ├── analytics/    # Hiring analytics
│   │   │   │   └── kyc/          # Verification
│   │   │   └── tpo/              # University/TPO dashboard (8 pages)
│   │   │       ├── home/         # Placement overview
│   │   │       ├── students/     # Student management
│   │   │       ├── placements/   # Placement tracker
│   │   │       ├── companies/    # Company connections
│   │   │       ├── employability/# Employability reports
│   │   │       ├── intervention/ # At-risk alerts
│   │   │       └── upload/       # Bulk upload
│   │   ├── components/
│   │   │   ├── Navbar.tsx        # Responsive nav with theme toggle
│   │   │   ├── ThemeProvider.tsx # Dark/light theme context
│   │   │   ├── audit/            # AuraScoreRing, RedlinePanel, InterviewPanel
│   │   │   └── career/           # CareerMatchCard, GapAnalysisPanel, MarketDemandPulse
│   │   ├── lib/
│   │   │   └── api.ts            # Typed Axios API client (all endpoints)
│   │   ├── store/
│   │   │   └── useAuditStore.ts  # Zustand global state
│   │   └── types/
│   │       └── index.ts          # Shared TypeScript types
│   ├── vercel.json
│   └── package.json
│
├── server/                      # Node.js + Express backend
│   ├── src/
│   │   ├── index.js              # Entry point, Socket.IO setup, CORS
│   │   ├── models/               # Mongoose schemas
│   │   │   ├── User.js           # Auth user (all roles)
│   │   │   ├── Student.js        # Career readiness, skills, points, badges
│   │   │   ├── Company.js        # Company profile, KYC
│   │   │   ├── University.js     # University/TPO profile
│   │   │   ├── Audit.js          # Resume audit results
│   │   │   ├── Job.js            # Job postings
│   │   │   ├── JobApplication.js # Applications
│   │   │   ├── Assessment.js     # Skill assessments
│   │   │   ├── Notification.js   # Real-time notifications
│   │   │   └── ...
│   │   ├── controllers/          # Business logic
│   │   │   ├── auditController.js  # Audit + career points + notifications
│   │   │   ├── studentController.js# Student CRUD + dashboard
│   │   │   ├── companyController.js
│   │   │   ├── tpoController.js
│   │   │   ├── jobController.js
│   │   │   └── authController.js
│   │   ├── routes/               # Express routers
│   │   └── middleware/
│   │       ├── auth.js           # JWT verification
│   │       └── upload.js         # Cloudinary + Multer config
│   ├── Dockerfile
│   ├── nixpacks.toml
│   └── package.json
│
└── ai-engine/                   # FastAPI Python AI service
    ├── main.py                   # Routes: /analyze, /roadmap, /interview, /enhance-bullet
    ├── services/
    │   ├── analyzer.py           # Gemini resume analysis pipeline
    │   ├── embeddings.py         # Gemini text-embedding-004 for career matching
    │   ├── career_engine.py      # Job matching, gap analysis, market demand
    │   └── roadmap.py            # 30-day roadmap generation
    ├── requirements.txt
    └── Dockerfile
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (student / company / tpo) |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/audit` | Upload resume + start analysis |
| GET | `/api/audit/:id` | Get full audit result |
| GET | `/api/audit/:id/status` | Poll audit status (processing / completed / failed) |
| GET | `/api/audit` | Get user's audit history |
| DELETE | `/api/audit/:id` | Delete audit + Cloudinary file |
| POST | `/api/audit/roadmap` | Generate 30-day learning roadmap |
| POST | `/api/audit/:id/interview` | Generate interview questions |
| POST | `/api/audit/enhance-bullet` | AI bullet point enhancement |

### Student
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/dashboard` | Full dashboard data |
| GET | `/api/student/profile` | Student profile |
| PUT | `/api/student/profile` | Update profile |
| POST | `/api/student/skills` | Add skill |
| PUT | `/api/student/skills/:name` | Update skill level |
| DELETE | `/api/student/skills/:name` | Remove skill |
| GET | `/api/student/leaderboard` | Global career points leaderboard |

### Jobs, Assessments, Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | Browse live job listings |
| POST | `/api/jobs/:id/apply` | Apply to a job |
| GET | `/api/notifications` | Get notifications |
| PATCH | `/api/notifications/:id/read` | Mark as read |

---

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB (local or Atlas)
- Cloudinary account
- Google AI API key (Gemini)

### 1. Clone & install

```bash
git clone https://github.com/SagarSwain05/Aura-Audit.git
cd Aura-Audit

# Frontend
cd client && npm install --legacy-peer-deps

# Backend
cd ../server && npm install --legacy-peer-deps

# AI Engine
cd ../ai-engine && pip install -r requirements.txt
```

### 2. Environment variables

**`server/.env`**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/aura-audit
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
AI_ENGINE_URL=http://localhost:8000
CLIENT_URL=http://localhost:3000
```

**`ai-engine/.env`**
```env
GEMINI_API_KEY=your_gemini_api_key
```

**`client/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_AI_URL=http://localhost:8000
```

### 3. Run all services

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — AI Engine
cd ai-engine && uvicorn main:app --reload --port 8000

# Terminal 3 — Frontend
cd client && npm run dev
```

Open http://localhost:3000

---

## Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` = Railway backend URL (no `/api` suffix)
   - `NEXT_PUBLIC_AI_URL` = Render AI engine URL
3. Framework: Next.js (auto-detected)

### Backend (Railway)
1. New project → Deploy from GitHub (`server/` directory)
2. Set all env vars in Railway dashboard
3. `nixpacks.toml` handles the build (`npm ci --legacy-peer-deps`)

### AI Engine (Render)
1. New Web Service → Docker runtime
2. Set `GEMINI_API_KEY` env var
3. Free tier: spins down after 15min inactivity

### Database (MongoDB Atlas)
1. Create cluster → Create user
2. Network Access: `0.0.0.0/0`
3. Copy connection string to `MONGO_URI`

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| Gemini text-embedding-004 over sentence-transformers | Removes 2GB torch dependency; Render free tier has RAM limits |
| Async audit processing with polling | Gemini analysis takes 30–60s; immediate 202 response improves UX |
| CSS variable inline styles for theme | Prevents Tailwind cascade ordering bugs in production builds |
| Socket.IO for real-time events | Instant notification delivery when audit completes |
| `--legacy-peer-deps` in npm ci | Resolves cloudinary@2 ↔ multer-storage-cloudinary@4 peer dep conflict |
| Zustand for global state | Lightweight, no boilerplate; persists audit results across route changes |

---

## Author

**Sagar Swain**
- GitHub: [@SagarSwain05](https://github.com/SagarSwain05)
- Built for national-level hackathons targeting UK/US and Indian tech markets

---

## License

MIT © 2026 Sagar Swain
