# TRUSTY PROJECT - QUICK REFERENCE GUIDE

## 🎯 PROJECT OVERVIEW

**Project Name:** Trusty (TrustLens)  
**Type:** Full-Stack SaaS - Feedback Verification & Trust Scoring Platform  
**Status:** Demo-Ready Production System  
**GitHub:** Monorepo with frontend + backend workspaces  
**Primary Use:** Vendor review authenticity verification with privacy-safe signals

---

## 📊 TECH STACK AT A GLANCE

| Component | Stack | Key Package | Version |
|-----------|-------|-------------|---------|
| **Frontend Framework** | React 19 | react, react-dom | 19.2.0 |
| **Frontend Bundler** | Vite | vite | 7.2.4 |
| **Frontend Router** | React Router | react-router-dom | 7.13.0 |
| **Frontend Styling** | TailwindCSS | tailwindcss | 3.4.17 |
| **Frontend UI Library** | Custom (Shadcn-style) | lucide-react | 0.577 |
| **Frontend Charts** | Recharts | recharts | 3.8.0 |
| **Frontend Notifications** | Sonner | sonner | 2.0.7 |
| **Backend Framework** | Express | express | 5.2.1 |
| **Backend Runtime** | Node.js | N/A | 18+ |
| **Database** | MongoDB | mongoose | 9.1.6 |
| **Authentication** | JWT + OTP | jsonwebtoken, bcryptjs | 9.0.3, 3.0.3 |
| **Geolocation** | MaxMind GeoIP2 | @maxmind/geoip2-node | 6.3.4 |
| **IP Risk Analysis** | IPQualityScore | undici (HTTP client) | 6.21.0 |
| **Email Sending** | Nodemailer | nodemailer | 8.0.3 |
| **HTTP Logging** | Morgan | morgan | 1.10.1 |
| **Security Headers** | Helmet | helmet | 8.1.0 |
| **CORS** | CORS middleware | cors | 2.8.6 |
| **Embeddings (Python)** | FastAPI + FAISS | fastapi, faiss-cpu | Latest |
| **Build & Development** | Npm Workspace | concurrently | 9.2.1 |

---

## 🗂️ DIRECTORY MAP

```
Trusty/
├── backend/               ← Node.js + Express + MongoDB
├── frontend/              ← React + Vite + Tailwind
├── docs/                  ← Trust scoring & embedding docs
├── package.json           ← Monorepo workspace config
└── README.md
```

### Backend Directory (`backend/src/`)
```
src/
├── index.js               ← Server entry
├── app.js                 ← Express app factory
├── db.js                  ← MongoDB connection
├── middleware/            ← Auth & error handling (2 files)
├── models/                ← MongoDB schemas (11 models)
├── routes/                ← API endpoints (6 routers)
├── services/              ← Business logic (10 services)
├── utils/                 ← Helpers
└── seed/                  ← Demo data generator
```

### Frontend Directory (`frontend/src/`)
```
src/
├── main.jsx               ← React root
├── App.jsx                ← Root router
├── pages/                 ← Page components (14 pages)
├── components/            ← Reusable components (70+)
│   ├── about/             ← About page sections
│   ├── admin/             ← Admin UI
│   ├── support/           ← Support features
│   ├── transparency/      ← Technical docs
│   ├── ui/                ← Primitives (7 components)
│   ├── vendorDashboard/   ← Dashboard (13 + pipeline)
│   ├── vendorProfile/     ← Profile editor (11)
│   ├── vendorSettings/    ← Settings (6)
│   └── vendorSignup/      ← Signup forms (4)
├── crm/                   ← CRM module (TypeScript)
├── lib/                   ← Utilities (api, session, device)
├── data/                  ← Chatbot knowledge JSON
└── styles/                ← CSS & Tailwind
```

---

## 🔑 KEY METRICS

| Metric | Count |
|--------|-------|
| **Database Models** | 11 |
| **API Routes** | 6 main routers + 50+ endpoints |
| **React Components** | 70+ |
| **Pages** | 14 |
| **Services** | 10 |
| **Middleware** | 2 |
| **TypeScript Files** | 5+ (CRM module) |
| **Total Files** | ~150 |
| **Estimated LOC** | ~12,000 |

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Auth Flow
1. **OTP-based login** (no password stored for initial auth)
2. **JWT tokens** (12h expiry, stored in localStorage)
3. **Role-based access** (ADMIN, VENDOR)
4. **Vendor parameter matching** (users can only access their vendor)

### Environment Secrets
```
JWT_SECRET              ← JWT signing key (required)
OTP_PEPPER              ← OTP hashing salt
IP_HASH_SALT            ← IP privacy salt
MONGO_URI               ← MongoDB connection (required)
SMTP_*                  ← Email configuration
IPQUALITYSCORE_API_KEY  ← IP risk analysis (optional)
```

---

## 📡 API ROUTING STRUCTURE

```
/api/
├── /auth                 ← Authentication (OTP login)
├── /public               ← Feedback submission & vendor profiles
├── /vendor               ← Vendor dashboard (requires auth)
├── /admin                ← Admin panel (requires admin role)
├── /support              ← Support tickets & messages
├── /leads                ← CRM lead management
└── /health               ← Health check
```

---

## 🧠 TRUST SCORING ALGORITHM

### 6 Base Signals (0-100 points total)

| Signal | Points | Purpose |
|--------|--------|---------|
| **Token Verification** | 0-25 | Feedback code validity |
| **Payment Proof** | 0-20 | Order payment status |
| **AI Behavior** | 0-25 | Copy-paste & typing detection |
| **Device Pattern** | 0-15 | Device fingerprint consistency |
| **IP Pattern** | 0-10 | Network type classification |
| **Context Depth** | 0-15 | Review detail & coherence |

### Score Adjustments

| Adjustment | Range | Purpose |
|------------|-------|---------|
| **IP Adjustment** | -6 to +4 | Network risk signal |
| **Duplicate Adjustment** | -30 to 0 | Near-duplicate penalty |
| **Typing Variance** | -10 to +10 | Consistency check |

### Formula
```
finalScore = clamp(baseScore + ipAdj + dupAdj + typingAdj, 0, 100)
```

### Trust Levels
- **HIGH:** Score ≥ 71
- **MEDIUM:** Score 40-70
- **LOW:** Score < 40

---

## 🎯 CORE WORKFLOWS

### 1. Feedback Submission Pipeline
```
1. Customer submits feedback (public or with token)
2. Extract IP & device fingerprint (hash only)
3. Validate feedback code (if provided)
4. Compute 6 trust signals
5. Query embedding service for duplicates
6. Apply adjustments (duplicate, typing, IP)
7. Generate blockchain anchor (SHA-256 hash)
8. Store in MongoDB
9. Send confirmation email
10. Return feedback with trust breakdown
```

### 2. Vendor Signup → Dashboard
```
1. Email OTP request
2. Enter email, verify OTP
3. Complete business details
4. Create Vendor & User records
5. Issue JWT token
6. Access dashboard with CRM, orders, feedback
```

### 3. Admin Vendor Management
```
1. View all vendors with stats
2. Flag vendor (soft block, for review)
3. Terminate vendor (hard block)
4. Reactivate vendor
5. All actions logged in AdminActionLog
```

### 4. CRM Lead Pipeline
```
Lead stages: new_lead → contacted → negotiation → invoice → payment → order → shipped → delivered → feedback_retention
```

---

## 🚀 DEPLOYMENT GUIDE

### Local Development
```bash
npm run dev              # Both frontend & backend
npm run dev:backend     # Backend only
npm run dev:frontend    # Frontend only
npm run seed            # Seed demo data
```

### Production Build
```bash
npm run build           # Build frontend (→ dist/)
npm run start           # Start backend
```

### Required Environment Variables

**Backend:**
```
MONGO_URI=mongodb://...
JWT_SECRET=<32+ chars>
PORT=5000
EMBEDDING_SERVICE_URL=http://localhost:8010
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password
SMTP_FROM="Trusty <noreply@trusty.com>"
MAXMIND_CITY_DB_PATH=./data/GeoLite2-City.mmdb
MAXMIND_ASN_DB_PATH=./data/GeoLite2-ASN.mmdb
```

**Frontend:**
```
VITE_API_URL=http://localhost:5000
```

---

## 📦 PACKAGE.JSON SCRIPTS

### Root Workspace
```json
{
  "scripts": {
    "dev": "concurrently -n backend,frontend ...",
    "dev:backend": "npm run dev --workspace backend",
    "dev:frontend": "npm run dev --workspace frontend",
    "seed": "npm run seed --workspace backend",
    "start": "npm run start --workspace backend"
  }
}
```

### Backend
```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "seed": "node src/seed/seed.js"
  }
}
```

### Frontend
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

---

## 🔍 DEBUGGING & TROUBLESHOOTING

### MongoDB Connection Issues
- **Error:** TLS alert
  - **Fix:** Check IP allowlist in MongoDB Atlas, ensure network access
  - **File:** `backend/src/db.js` has detailed error messages

### Embedding Service Fails
- **Error:** timeout or ECONNREFUSED
- **Fix:** Ensure Python FastAPI service is running on port 8010
- **Retry:** Automatic 3x retry with exponential backoff (2.5s timeout)

### CORS Issues
- **Error:** CORS blocked in browser
- **Fix:** Check `CORS_ORIGIN` in backend `.env`, verify frontend URL
- **File:** `backend/src/app.js` has CORS config

### OTP Not Sending
- **Error:** Email simulated in console
- **Fix:** Configure SMTP in `.env` (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)
- **Fallback:** Console logs email content if SMTP not configured

### Vendor Session Stale (404)
- **Error:** Vendor route returns 404
- **Fix:** Verify vendor ID in localStorage session
- **Reference:** `/memories/repo/trusty-vendor-session-stale-404.md`

---

## 🔒 SECURITY CHECKLIST

- ✅ No raw IP addresses stored (only ipHash)
- ✅ No device IDs collected
- ✅ Passwords bcrypt-hashed (10 rounds)
- ✅ OTP hashed before storage
- ✅ JWT expiry 12 hours
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting on public endpoints
- ✅ Helmet.js security headers
- ✅ CORS whitelist validation
- ✅ Request body size limit (5MB)
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (MongoDB)

---

## 📈 PERFORMANCE TIPS

### Database
- Use `lean()` queries for read-only operations
- Index on frequently queried fields (vendorId, status, dates)
- MongoDB read replicas for load distribution

### Frontend
- Code splitting via React Router (lazy routes)
- TailwindCSS with PurgeCSS (remove unused styles)
- Image optimization (lucide-react for SVG icons)
- Session caching (localStorage)

### Backend
- Embedding service retry with exponential backoff
- Multiple API base fallback (local→cloud)
- IP lookup caching
- Connection pooling (Mongoose default)

---

## 📚 DOCUMENTATION FILES

| File | Purpose |
|------|---------|
| `README.md` | Project overview & quick start |
| `PROJECT_STRUCTURE_AUDIT.md` | **You are here** - Complete technical audit (17 sections) |
| `VISUAL_FOLDER_TREE.md` | Detailed folder tree with descriptions |
| `docs/trust-scoring-spec.md` | Trust algorithm deep dive |
| `docs/embedding-service-api.md` | Python embedding service docs |

---

## 🎓 LEARNING PATHS

### Want to understand Trust Scoring?
1. Read `docs/trust-scoring-spec.md`
2. Review `backend/src/services/trustScoringService.js`
3. Check `backend/src/services/feedbackService.js`
4. See `frontend/src/components/transparency/TrustSignals.jsx`

### Want to add a new Vendor Feature?
1. Create route in `backend/src/routes/vendor.js`
2. Add business logic in `backend/src/services/vendorService.js`
3. Create React component in `frontend/src/components/vendorDashboard/`
4. Add page/tab in `frontend/src/pages/VendorDashboard.jsx`

### Want to add Admin Feature?
1. Create endpoint in `backend/src/routes/admin.js`
2. Add service logic in `backend/src/services/adminService.js`
3. Create React component in `frontend/src/components/admin/`
4. Add admin page in `frontend/src/pages/admin/`

### Want to understand Database Schema?
1. Review all files in `backend/src/models/`
2. Check relationships in audit document section 5.2
3. See indexing strategy in section 5.3

---

## 🆘 COMMON ISSUES & SOLUTIONS

| Issue | Cause | Solution |
|-------|-------|----------|
| Feedback score stuck at 0 | Token validation failed | Check feedback code in order |
| Embedding timeout | Python service down | Verify `http://localhost:8010/health` |
| OTP not received | SMTP not configured | Add SMTP_* env vars or check console logs |
| Vendor can't login | Wrong email or no OTP | Resend OTP, check email for code |
| Duplicate detection broken | Embedding service offline | Restart embedding service, check logs |
| CORS blocked | Frontend URL mismatch | Update `CORS_ORIGIN` in backend `.env` |
| MongoDB timeout | Network issue or wrong URI | Verify MongoDB connection, check IP allowlist |

---

## 📞 SUPPORT CONTACTS & REFERENCES

### Session Memory Files
- `/memories/session/` - Current conversation notes

### Repo Memory Files
- `/memories/repo/trusty-feedback-location-capture.md`
- `/memories/repo/trusty-feedback-pipeline.md`
- `/memories/repo/trusty-frontend-tailwind-profile.md`
- `/memories/repo/trusty-mongo-read-retries.md`
- `/memories/repo/trusty-otp-auth-system.md`
- `/memories/repo/trusty-vendor-session-stale-404.md`
- `/memories/repo/trusty-vendor-templates-module.md`

---

## 🎯 NEXT STEPS

### For Development
1. Copy `.env.example` to `.env` in both backend & frontend
2. Set up MongoDB URI & JWT_SECRET
3. Download MaxMind databases to `backend/data/`
4. Run `npm run seed` to populate demo data
5. Start with `npm run dev`

### For Production
1. Use MongoDB Atlas or managed instance
2. Set strong JWT_SECRET (32+ random chars)
3. Configure SMTP for email delivery
4. Get MaxMind GeoLite2 databases (free tier)
5. Deploy backend to Heroku/AWS/DigitalOcean
6. Deploy frontend to Vercel/Netlify
7. Run Python embedding service separately

### For Learning
1. Start with `HomePage.jsx` to understand routing
2. Review `trustScoringService.js` for algorithm
3. Check vendor dashboard for state management
4. Explore CRM module for TypeScript usage
5. Read transparency pages for technical details

---

**Generated:** April 29, 2026  
**Project Status:** ✅ Demo-Ready, Production-Grade Code Quality  
**Maintenance:** Active - See memory files for recent context
