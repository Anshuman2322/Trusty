# TRUSTY PROJECT - COMPLETE VISUAL FOLDER TREE

```
c:\anshuman\coading\sem 4\Trusty\
│
├── 📦 PACKAGE.JSON (Root Workspace)
│   ├─ workspaces: ["backend", "frontend"]
│   └─ scripts: dev, dev:backend, dev:frontend, seed, start
│
├── 📄 README.md (Project Overview)
├── 📄 PROJECT_STRUCTURE_AUDIT.md (This Document - 17 Sections)
├── 📄 .gitignore
├── 📄 .env (Local Development)
├── 📄 .env.example (Template)
│
├── 📁 backend/
│   │
│   ├── 📦 package.json
│   │   └─ dependencies: express@5, mongoose@9, jsonwebtoken@9, bcryptjs@3,
│   │      @maxmind/geoip2-node, nodemailer, helmet, morgan
│   │
│   ├── 📄 .env (Backend Config)
│   ├── 📄 .env.example
│   ├── 📁 node_modules/
│   │
│   ├── 📁 data/
│   │   ├── GeoLite2-City.mmdb (Binary - MaxMind IP geolocation)
│   │   └── GeoLite2-ASN.mmdb (Binary - ASN/ISP data)
│   │
│   ├── 📁 src/
│   │   │
│   │   ├── 📄 index.js (14 lines)
│   │   │   └─ Bootstrap: connects DB, creates app, listens on port
│   │   │
│   │   ├── 📄 app.js (48 lines)
│   │   │   ├─ Express middleware setup
│   │   │   ├─ CORS configuration
│   │   │   ├─ Helmet security headers
│   │   │   ├─ Request body parsing
│   │   │   ├─ Morgan HTTP logging
│   │   │   ├─ Health endpoint (/api/health)
│   │   │   ├─ Route registration
│   │   │   └─ Error middleware
│   │   │
│   │   ├── 📄 db.js (42 lines)
│   │   │   ├─ MongoDB connection factory
│   │   │   ├─ Retry logic (5 attempts, exponential backoff)
│   │   │   └─ TLS error detection for Atlas
│   │   │
│   │   ├── 📁 middleware/ (2 files)
│   │   │   ├── 📄 authMiddleware.js (30 lines)
│   │   │   │   ├─ requireAuth() - JWT validation
│   │   │   │   ├─ requireRole(role) - RBAC
│   │   │   │   └─ requireVendorParamMatch() - Vendor verification
│   │   │   │
│   │   │   └── 📄 errorMiddleware.js (23 lines)
│   │   │       ├─ Centralized error handling
│   │   │       ├─ Status code mapping
│   │   │       └─ 413 payload size handling
│   │   │
│   │   ├── 📁 models/ (11 MongoDB schemas)
│   │   │   ├── 📄 User.js (11 lines)
│   │   │   │   └─ Fields: email, passwordHash, role, vendorId, lastLoginAt
│   │   │   │
│   │   │   ├── 📄 Vendor.js (100+ lines)
│   │   │   │   ├─ Fields: name, email, category, country, city
│   │   │   │   ├─ Nested: settings, profileVisibility
│   │   │   │   ├─ Status: isFlagged, isTerminated, termsAccepted
│   │   │   │   └─ History: flaggedAt, flaggedBy, terminatedAt, terminatedBy
│   │   │   │
│   │   │   ├── 📄 Order.js (40 lines)
│   │   │   │   ├─ Fields: vendorId, customerName, email, phone
│   │   │   │   ├─ Delivery: paymentStatus, deliveryStatus, deliveryHistory
│   │   │   │   ├─ Location: createdLocation, paymentLocation
│   │   │   │   └─ Feedback: feedbackCode (unique)
│   │   │   │
│   │   │   ├── 📄 Feedback.js (120+ lines)
│   │   │   │   ├─ Core: vendorId, orderId, text, images (0-3)
│   │   │   │   ├─ Trust Scoring:
│   │   │   │   │   ├─ trustScore (0-100)
│   │   │   │   │   ├─ trustLevel (HIGH/MEDIUM/LOW)
│   │   │   │   │   ├─ trustBreakdown (6 signal components)
│   │   │   │   │   ├─ baseTrustScore
│   │   │   │   │   ├─ finalTrustScore
│   │   │   │   │   └─ breakdown list with explanations
│   │   │   │   ├─ Privacy-Safe Hashes:
│   │   │   │   │   ├─ textHash (SHA-256 of normalized text)
│   │   │   │   │   ├─ deviceHash
│   │   │   │   │   ├─ deviceFingerprintHash
│   │   │   │   │   ├─ sessionIdHash
│   │   │   │   │   └─ ipHash (never raw IP)
│   │   │   │   ├─ IP Location (privacy-safe):
│   │   │   │   │   ├─ ipCountry, ipCountryName
│   │   │   │   │   ├─ ipRegion, ipState, ipCity
│   │   │   │   │   ├─ ipTimezone, ipRiskLevel
│   │   │   │   │   └─ ipFeedbackCount
│   │   │   │   ├─ Adjustments:
│   │   │   │   │   ├─ dupAdj (duplicate adjustment)
│   │   │   │   │   ├─ dupReason
│   │   │   │   │   ├─ typingAdj (typing variance adjustment)
│   │   │   │   │   └─ typingVarianceZ
│   │   │   │   ├─ AI Behavior Analysis:
│   │   │   │   │   ├─ aiConfidence (0-100)
│   │   │   │   │   ├─ aiSignals (copy-paste, synthetic, etc.)
│   │   │   │   │   └─ typingMetrics
│   │   │   │   ├─ Embeddings:
│   │   │   │   │   └─ embeddingAudit (model version, similarity scores, neighbors)
│   │   │   │   ├─ Blockchain:
│   │   │   │   │   ├─ blockchain.hash (SHA-256 metadata hash)
│   │   │   │   │   └─ blockchain.txRef (simulated TX reference)
│   │   │   │   └─ Service Quality:
│   │   │   │       └─ serviceHighlights (response, quality, delivery)
│   │   │   │
│   │   │   ├── 📄 Message.js (30 lines)
│   │   │   │   ├─ Fields: referenceId, vendorId, message, userName, userEmail
│   │   │   │   ├─ Threading: replies (MessageReplySchema array)
│   │   │   │   ├─ Status: open, replied, closed
│   │   │   │   └─ Source: chatbot, public-page, manual
│   │   │   │
│   │   │   ├── 📄 Ticket.js (45 lines)
│   │   │   │   ├─ Fields: referenceId, issueType, description, priority
│   │   │   │   ├─ Status: open, in-progress, resolved
│   │   │   │   ├─ Threading: replies, customerFollowUps
│   │   │   │   └─ Customer Satisfaction: pending, satisfied, not-satisfied
│   │   │   │
│   │   │   ├── 📄 Lead.js (80 lines)
│   │   │   │   ├─ Fields: vendorId, name, email, phone, address
│   │   │   │   ├─ CRM: crmStage, priority, status
│   │   │   │   ├─ Pipeline: new_lead → contacted → ... → feedback_retention
│   │   │   │   ├─ Business: country, product
│   │   │   │   ├─ Qualification: budget, paymentStatus, deliveryStatus
│   │   │   │   └─ Notes: sentiment, lastActivity
│   │   │   │
│   │   │   ├── 📄 Invoice.js (20 lines)
│   │   │   │   ├─ Fields: vendorId, orderId, invoiceNumber (unique)
│   │   │   │   ├─ Billing: amount, status (ISSUED/PAID)
│   │   │   │   └─ Tracking: emails (EmailEventSchema array)
│   │   │   │
│   │   │   ├── 📄 OTP.js (15 lines)
│   │   │   │   ├─ Fields: email, otp (hashed), purpose
│   │   │   │   ├─ Security: attemptsLeft (0-3), expiresAt (TTL index)
│   │   │   │   └─ Purposes: SIGNUP, RESET_PASSWORD, LOGIN, ADMIN_LOGIN
│   │   │   │
│   │   │   ├── 📄 AdminActionLog.js (13 lines)
│   │   │   │   ├─ Fields: actionType, actorUserId, vendorId, reason
│   │   │   │   ├─ Actions: FLAG_VENDOR, UNFLAG_VENDOR, TERMINATE_VENDOR, REACTIVATE_VENDOR
│   │   │   │   └─ Metadata: custom fields
│   │   │   │
│   │   │   └── 📄 AdminSettings.js (25 lines)
│   │   │       ├─ Key: "global" (singleton)
│   │   │       ├─ trustThresholds: trustedMin, mediumMin
│   │   │       ├─ fraudSensitivity: LOW, MEDIUM, HIGH
│   │   │       └─ alerts: repeatedDeviceMin, networkReviewMin, etc.
│   │   │
│   │   ├── 📁 routes/ (6 API routers)
│   │   │   ├── 📄 index.js (10 lines)
│   │   │   │   └─ Route registration hub
│   │   │   │
│   │   │   ├── 📄 auth.js (250+ lines) → /api/auth
│   │   │   │   ├─ POST /send-otp
│   │   │   │   ├─ POST /verify-otp-signup
│   │   │   │   ├─ POST /verify-otp-reset-password
│   │   │   │   ├─ POST /reset-password
│   │   │   │   ├─ POST /admin-login
│   │   │   │   └─ POST /verify-admin-otp
│   │   │   │
│   │   │   ├── 📄 public.js (300+ lines) → /api/public
│   │   │   │   ├─ GET /vendors (list with public filtering)
│   │   │   │   ├─ GET /vendors/:vendorId (profile)
│   │   │   │   ├─ GET /vendors/:vendorId/feedback (paginated)
│   │   │   │   ├─ POST /vendors/:vendorId/feedback (submit)
│   │   │   │   ├─ GET /order/:feedbackCode/status
│   │   │   │   └─ GET /orders/:orderId
│   │   │   │
│   │   │   ├── 📄 vendor.js (300+ lines) → /api/vendor
│   │   │   │   ├─ GET /overview (dashboard stats)
│   │   │   │   ├─ POST /orders (create order)
│   │   │   │   ├─ PUT /orders/:orderId/payment-confirm
│   │   │   │   ├─ PUT /orders/:orderId/delivery
│   │   │   │   ├─ GET /feedback
│   │   │   │   ├─ GET /:vendorId/profile
│   │   │   │   ├─ PUT /:vendorId/profile
│   │   │   │   ├─ GET /:vendorId/settings
│   │   │   │   ├─ PUT /:vendorId/settings
│   │   │   │   ├─ GET /:vendorId/public-visibility
│   │   │   │   └─ PUT /:vendorId/public-visibility
│   │   │   │
│   │   │   ├── 📄 admin.js (200+ lines) → /api/admin
│   │   │   │   ├─ GET /overview (system metrics)
│   │   │   │   ├─ GET /vendors (list all)
│   │   │   │   ├─ GET /feedbacks (filtered)
│   │   │   │   ├─ GET /vendors/:vendorId/detail
│   │   │   │   ├─ GET /analytics/snapshot
│   │   │   │   ├─ GET /alerts
│   │   │   │   ├─ GET /patterns (fraud clusters)
│   │   │   │   ├─ GET /settings
│   │   │   │   ├─ PUT /settings
│   │   │   │   ├─ POST /vendors/:vendorId/flag
│   │   │   │   ├─ POST /vendors/:vendorId/terminate
│   │   │   │   └─ GET /action-logs
│   │   │   │
│   │   │   ├── 📄 support.js (250+ lines) → /api/support
│   │   │   │   ├─ POST /messages (rate-limited)
│   │   │   │   ├─ GET /messages/:referenceId
│   │   │   │   ├─ POST /messages/:referenceId/reply
│   │   │   │   ├─ POST /tickets (rate-limited)
│   │   │   │   ├─ GET /tickets/:referenceId
│   │   │   │   ├─ POST /tickets/:referenceId/reply
│   │   │   │   └─ POST /tickets/:referenceId/customer-close
│   │   │   │
│   │   │   └── 📄 leads.js (200+ lines) → /api/leads
│   │   │       ├─ POST / (create lead)
│   │   │       ├─ GET / (list with filters)
│   │   │       ├─ GET /:leadId
│   │   │       ├─ PUT /:leadId
│   │   │       ├─ DELETE /:leadId
│   │   │       └─ PUT /:leadId/crm-stage
│   │   │
│   │   ├── 📁 services/ (10 business logic modules)
│   │   │   ├── 📄 trustScoringService.js (400+ lines)
│   │   │   │   ├─ scoreTokenVerification() → 0-25 points
│   │   │   │   ├─ scorePaymentProof() → 0-20 points
│   │   │   │   ├─ scoreAiBehavior() → 0-25 points
│   │   │   │   │   └─ Detects: copy-paste, typing speed, edit patterns
│   │   │   │   ├─ scoreDevicePattern() → 0-15 points
│   │   │   │   ├─ scoreIpPattern() → 0-10 points + adjustment
│   │   │   │   ├─ scoreContextDepth() → 0-15 points
│   │   │   │   ├─ computeDuplicateAdjustment() → -30 to 0
│   │   │   │   ├─ computeTypingVarianceAdjustment() → -10 to +10
│   │   │   │   └─ Formula: finalScore = clamp(base + ipAdj + dupAdj + typingAdj, 0, 100)
│   │   │   │
│   │   │   ├── 📄 feedbackService.js (400+ lines)
│   │   │   │   ├─ submitFeedback() → Main pipeline
│   │   │   │   ├─ computeCountryRelation() → IP vs order location
│   │   │   │   ├─ Validation: images, text length, rating
│   │   │   │   └─ Integration: embedding service, blockchain
│   │   │   │
│   │   │   ├── 📄 authService.js (40 lines)
│   │   │   │   ├─ hashPassword(password) → bcrypt 10 rounds
│   │   │   │   ├─ verifyPassword(password, hash)
│   │   │   │   ├─ signToken(payload) → JWT 12h expiry
│   │   │   │   └─ verifyToken(token)
│   │   │   │
│   │   │   ├── 📄 vendorService.js (300+ lines)
│   │   │   │   ├─ createOrder() → Generate feedback code
│   │   │   │   ├─ confirmPayment()
│   │   │   │   ├─ updateDeliveryStatus()
│   │   │   │   ├─ getVendorOverview() → Dashboard stats
│   │   │   │   ├─ computeVendorPublicProfile() → Privacy filtering
│   │   │   │   └─ computeStatusBadge() → Trusted/Medium/Risky
│   │   │   │
│   │   │   ├── 📄 adminService.js (300+ lines)
│   │   │   │   ├─ computeAdminOverview() → System metrics
│   │   │   │   ├─ listAdminVendors()
│   │   │   │   ├─ computeAlerts() → Fraud patterns
│   │   │   │   ├─ flagVendor() → Creates AdminActionLog
│   │   │   │   ├─ terminateVendor()
│   │   │   │   ├─ getPatternClusters() → Similarity detection
│   │   │   │   └─ getAnalyticsSnapshot()
│   │   │   │
│   │   │   ├── 📄 embeddingService.js (150+ lines)
│   │   │   │   ├─ upsertAndSearch() → Call Python service
│   │   │   │   ├─ Retry logic: 3 attempts, exponential backoff
│   │   │   │   ├─ Timeout: 2500ms
│   │   │   │   └─ Purpose: Near-duplicate detection
│   │   │   │
│   │   │   ├── 📄 ipIntelService.js (300+ lines)
│   │   │   │   ├─ inspectClientIp() → MaxMind + IPQualityScore
│   │   │   │   ├─ extractClientIp() → Parse X-Forwarded-For
│   │   │   │   ├─ toLocationSnapshot() → Create hashed record
│   │   │   │   └─ Privacy: Never stores raw IP, only ipHash
│   │   │   │
│   │   │   ├── 📄 emailService.js (50 lines)
│   │   │   │   ├─ sendEmail({ to, subject, body })
│   │   │   │   ├─ SMTP config with TLS 1.2+
│   │   │   │   └─ Fallback: Console simulation
│   │   │   │
│   │   │   ├── 📄 cryptoService.js (10 lines)
│   │   │   │   ├─ sha256Hex(input) → SHA-256 hashing
│   │   │   │   └─ generateTxRef() → Blockchain reference
│   │   │   │
│   │   │   └── 📄 mongoReadRetry.js (30 lines)
│   │   │       └─ withMongoReadRetry() → Read replica fallback
│   │   │
│   │   ├── 📁 utils/
│   │   │   └── 📄 sendEmail.js (50 lines)
│   │   │       └─ Email helper utilities
│   │   │
│   │   └── 📁 seed/
│   │       └── 📄 seed.js (200+ lines)
│   │           ├─ 5 demo vendors
│   │           ├─ 20 demo orders
│   │           ├─ 50 demo feedback entries
│   │           ├─ 1 admin user
│   │           └─ Sample messages, tickets, leads
│   │
│   └── 📁 embedding_service/ (Python FastAPI)
│       ├── 📄 main.py
│       │   ├─ GET /health
│       │   ├─ POST /embed
│       │   ├─ POST /upsert-and-search (main)
│       │   └─ POST /search
│       │
│       ├── 📄 README.md
│       │   └─ Service documentation
│       │
│       ├── 📄 requirements.txt
│       │   └─ FastAPI, FAISS, sentence-transformers
│       │
│       └── 📁 data/
│           ├── faiss.index (Binary - similarity index)
│           └── meta.json (Embedding metadata)
│
│
├── 📁 frontend/
│   │
│   ├── 📦 package.json
│   │   └─ dependencies: react@19, react-dom@19, react-router-dom@7,
│   │      vite@7, tailwindcss@3, recharts@3, lucide-react, sonner
│   │
│   ├── 📄 vite.config.js
│   │   └─ React plugin, HMR for dev
│   │
│   ├── 📄 tailwind.config.cjs
│   │   ├─ Prefix: tw-
│   │   └─ Custom colors via CSS variables
│   │
│   ├── 📄 postcss.config.cjs
│   ├── 📄 eslint.config.js
│   ├── 📄 index.html (SPA template)
│   ├── 📄 .env (Frontend config)
│   ├── 📄 .env.example
│   ├── 📄 vercel.json (Vercel deployment)
│   │
│   ├── 📁 public/
│   │   └─ Static assets (favicon, robots.txt, etc.)
│   │
│   ├── 📁 src/
│   │   │
│   │   ├── 📄 main.jsx (11 lines)
│   │   │   └─ React root render with Router
│   │   │
│   │   ├── 📄 App.jsx (200+ lines)
│   │   │   ├─ Root routing logic
│   │   │   ├─ Theme management (light/dark)
│   │   │   ├─ Session detection
│   │   │   ├─ RequireVendorAuth guard
│   │   │   └─ Layout routing
│   │   │
│   │   ├── 📁 pages/ (14 page components)
│   │   │   ├── 📄 HomePage.jsx
│   │   │   │   └─ Route: /
│   │   │   │
│   │   │   ├── 📄 HowItWorksPage.jsx
│   │   │   │   └─ Route: /how-it-works
│   │   │   │
│   │   │   ├── 📄 AboutPage.jsx
│   │   │   │   └─ Route: /about
│   │   │   │
│   │   │   ├── 📄 TransparencyPage.jsx
│   │   │   │   └─ Route: /transparency (Technical details)
│   │   │   │
│   │   │   ├── 📄 VendorPage.jsx
│   │   │   │   └─ Route: /vendor (Marketing)
│   │   │   │
│   │   │   ├── 📄 PublicView.jsx
│   │   │   │   └─ Route: /public/:vendorId (Vendor profile)
│   │   │   │
│   │   │   ├── 📄 VendorLoginPage.jsx
│   │   │   │   └─ Route: /vendor/login (OTP login)
│   │   │   │
│   │   │   ├── 📄 VendorSignupPage.jsx
│   │   │   │   └─ Route: /vendor/signup
│   │   │   │
│   │   │   ├── 📄 ForgotPasswordPage.jsx
│   │   │   │   └─ Route: /forgot-password
│   │   │   │
│   │   │   ├── 📄 VendorDashboard.jsx (300+ lines)
│   │   │   │   └─ Route: /vendor/dashboard/* (Protected)
│   │   │   │       ├─ dashboard (Overview)
│   │   │   │       ├─ templates (Email templates)
│   │   │   │       ├─ sales-command (CRM command center)
│   │   │   │       ├─ pipeline (Kanban pipeline)
│   │   │   │       ├─ orders (Orders table)
│   │   │   │       ├─ payments (Payment history)
│   │   │   │       ├─ feedback (Feedback list)
│   │   │   │       ├─ messages (Messages inbox)
│   │   │   │       ├─ leads (Lead list)
│   │   │   │       ├─ analytics (Detailed metrics)
│   │   │   │       ├─ customers (Customer insights)
│   │   │   │       ├─ profile (Profile editor)
│   │   │   │       └─ settings (Vendor settings)
│   │   │   │
│   │   │   ├── 📄 VendorAnalyticsPage.jsx
│   │   │   │   └─ Route: /vendor/analytics (Protected)
│   │   │   │
│   │   │   ├── 📄 AdminDashboard.jsx (300+ lines)
│   │   │   │   └─ Route: /admin/* (Protected)
│   │   │   │       ├─ dashboard (Main overview)
│   │   │   │       ├─ vendors (Vendor list)
│   │   │   │       ├─ feedbacks (Feedback review)
│   │   │   │       ├─ analytics (System analytics)
│   │   │   │       ├─ alerts (Risk alerts)
│   │   │   │       ├─ patterns (Fraud patterns)
│   │   │   │       ├─ reports (Reporting)
│   │   │   │       ├─ tickets (Support tickets)
│   │   │   │       ├─ vendor-detail/:vendorId
│   │   │   │       ├─ vendor-profile/:vendorId
│   │   │   │       └─ settings (Admin settings)
│   │   │   │
│   │   │   └── 📁 admin/
│   │   │       ├── 📄 AnalyticsPage.jsx
│   │   │       ├── 📄 DashboardPage.jsx
│   │   │       ├── 📄 FeedbackPage.jsx
│   │   │       ├── 📄 PatternsPage.jsx
│   │   │       ├── 📄 ReportsPage.jsx
│   │   │       ├── 📄 RiskAlertsPage.jsx
│   │   │       ├── 📄 SettingsPage.jsx
│   │   │       ├── 📄 TicketsPage.jsx
│   │   │       ├── 📄 VendorDetailPage.jsx
│   │   │       ├── 📄 VendorProfilePage.jsx
│   │   │       └── 📄 VendorsPage.jsx
│   │   │
│   │   ├── 📁 components/
│   │   │   │
│   │   │   ├── 📄 Chatbot.jsx (300+ lines)
│   │   │   │   ├─ AI support bot with routing
│   │   │   │   ├─ Context-aware responses
│   │   │   │   ├─ Menu-driven navigation
│   │   │   │   └─ Modal overlays (ticket, tracking, contact)
│   │   │   │
│   │   │   ├── 📄 Chatbot.css (Component styles)
│   │   │   ├── 📄 Footer.jsx
│   │   │   ├── 📄 FormCheckbox.jsx
│   │   │   ├── 📄 FormInput.jsx
│   │   │   ├── 📄 FormSelect.jsx
│   │   │   ├── 📄 OTPInput.jsx (6-digit code input)
│   │   │   ├── 📄 StarRating.jsx (5-star display)
│   │   │   ├── 📄 VendorAuthCard.jsx
│   │   │   ├── 📄 FeedbackExplanation.jsx (Trust breakdown modal)
│   │   │   ├── 📄 VendorAuth.css
│   │   │   ├── 📄 VendorAuthCard.css
│   │   │   │
│   │   │   ├── 📁 about/ (8 components)
│   │   │   │   ├── 📄 AboutCTA.jsx
│   │   │   │   ├── 📄 AboutHero.jsx
│   │   │   │   ├── 📄 AboutIcon.jsx
│   │   │   │   ├── 📄 PrinciplesSection.jsx
│   │   │   │   ├── 📄 PrivacySection.jsx
│   │   │   │   ├── 📄 ProblemSection.jsx
│   │   │   │   ├── 📄 SolutionSection.jsx
│   │   │   │   ├── 📄 TechnologySection.jsx
│   │   │   │   ├── 📄 TrustFlowSection.jsx
│   │   │   │   ├── 📄 WhyTrustySection.jsx
│   │   │   │   └── 📄 index.js (Barrel export)
│   │   │   │
│   │   │   ├── 📁 admin/ (5 components)
│   │   │   │   ├── 📄 AdminLayout.jsx
│   │   │   │   ├── 📄 AdminUi.jsx
│   │   │   │   ├── 📄 ConfirmationModal.jsx (Action confirmation)
│   │   │   │   ├── 📄 Sidebar.jsx (Navigation)
│   │   │   │   └── 📄 TopBar.jsx (Header)
│   │   │   │
│   │   │   ├── 📁 support/ (8 components)
│   │   │   │   ├── 📄 ChatInput.jsx
│   │   │   │   ├── 📄 ChatMessage.jsx
│   │   │   │   ├── 📄 ContactVendorModal.jsx
│   │   │   │   ├── 📄 QuickActionButtons.jsx
│   │   │   │   ├── 📄 QuickActions.jsx
│   │   │   │   ├── 📄 SubmissionSuccessModal.jsx
│   │   │   │   ├── 📄 TicketModal.jsx (Ticket creation)
│   │   │   │   └── 📄 TrackTicketModal.jsx (Ticket tracking)
│   │   │   │
│   │   │   ├── 📁 transparency/ (13 components)
│   │   │   │   ├── 📄 AISimilaritySection.jsx
│   │   │   │   ├── 📄 ArchitectureSection.jsx (System diagram)
│   │   │   │   ├── 📄 BlockchainSection.jsx
│   │   │   │   ├── 📄 DocsHero.jsx
│   │   │   │   ├── 📄 FAQSection.jsx
│   │   │   │   ├── 📄 IntegrityRules.jsx
│   │   │   │   ├── 📄 LimitationsSection.jsx
│   │   │   │   ├── 📄 PrivacySection.jsx
│   │   │   │   ├── 📄 TransparencyIcon.jsx
│   │   │   │   ├── 📄 TrustScoreOverview.jsx
│   │   │   │   ├── 📄 TrustSignals.jsx (6 signals breakdown)
│   │   │   │   └── 📄 index.js (Barrel export)
│   │   │   │
│   │   │   ├── 📁 ui/ (7 shadcn-style primitives)
│   │   │   │   ├── 📄 badge.tsx
│   │   │   │   ├── 📄 button.tsx
│   │   │   │   ├── 📄 card.tsx
│   │   │   │   ├── 📄 input.tsx
│   │   │   │   ├── 📄 select.tsx
│   │   │   │   ├── 📄 tabs.tsx
│   │   │   │   └── 📄 textarea.tsx
│   │   │   │
│   │   │   ├── 📁 vendorDashboard/ (13 components + pipeline/)
│   │   │   │   ├── 📄 AlertsPanel.jsx (Risk alerts)
│   │   │   │   ├── 📄 AnalyticsPage.jsx
│   │   │   │   ├── 📄 ChartsSection.jsx (Recharts)
│   │   │   │   ├── 📄 CustomerInsights.jsx
│   │   │   │   ├── 📄 DashboardCards.jsx (KPI cards)
│   │   │   │   ├── 📄 dataUtils.js
│   │   │   │   ├── 📄 InsightsPanel.jsx
│   │   │   │   ├── 📄 LeadsSection.jsx
│   │   │   │   ├── 📄 OrdersTable.jsx (Data table)
│   │   │   │   ├── 📄 TemplatesStudio.jsx (Template editor)
│   │   │   │   ├── 📄 Sidebar.jsx (Dashboard navigation)
│   │   │   │   ├── 📄 index.js (Barrel export)
│   │   │   │   │
│   │   │   │   └── 📁 pipeline/
│   │   │   │       ├── 📄 CardDetailsDrawer.jsx (Lead/order details)
│   │   │   │       ├── 📄 CrmWorkspaceTabs.jsx
│   │   │   │       ├── 📄 LeadCard.jsx (Pipeline card)
│   │   │   │       ├── 📄 PipelineBoard.jsx (Kanban main)
│   │   │   │       ├── 📄 PipelineBoard.css
│   │   │   │       ├── 📄 RecordDrawer.jsx (Editor panel)
│   │   │   │       ├── 📄 RecordDrawer.css
│   │   │   │       ├── 📄 StageColumn.jsx (Pipeline stage)
│   │   │   │       ├── 📁 EmailTemplates/
│   │   │   │       │   └─ (Email templates for outreach)
│   │   │   │       └── 📁 InvoiceTemplates/
│   │   │   │           └─ (Invoice templates)
│   │   │   │
│   │   │   ├── 📁 vendorProfile/ (11 components)
│   │   │   │   ├── 📄 AdditionalInfoBox.jsx
│   │   │   │   ├── 📄 BrandAssetsBox.jsx (Logo upload)
│   │   │   │   ├── 📄 BusinessDetailsForm.jsx
│   │   │   │   ├── 📄 constants.js (Category options)
│   │   │   │   ├── 📄 ContactForm.jsx
│   │   │   │   ├── 📄 DescriptionBox.jsx (Bio editor)
│   │   │   │   ├── 📄 LocationForm.jsx (Address)
│   │   │   │   ├── 📄 ProfilePage.jsx (Main container)
│   │   │   │   ├── 📄 ProfilePreviewCard.jsx (Public preview)
│   │   │   │   ├── 📄 PublicVisibilityControls.jsx (Privacy toggles)
│   │   │   │   └── 📄 index.js (Barrel export)
│   │   │   │
│   │   │   ├── 📁 vendorSettings/ (6 components)
│   │   │   │   ├── 📄 DropdownSelect.jsx
│   │   │   │   ├── 📄 SettingsPage.jsx (Main container)
│   │   │   │   ├── 📄 SettingsSection.jsx (Grouping)
│   │   │   │   ├── 📄 SliderControl.jsx (Range slider)
│   │   │   │   ├── 📄 ToggleSwitch.jsx (Boolean toggle)
│   │   │   │   └── 📄 index.js (Barrel export)
│   │   │   │
│   │   │   └── 📁 vendorSignup/ (4 components)
│   │   │       ├── 📄 CheckboxField.jsx
│   │   │       ├── 📄 InputField.jsx
│   │   │       ├── 📄 SelectField.jsx
│   │   │       └── 📄 SignupForm.jsx (Main form)
│   │   │
│   │   ├── 📁 crm/ (TypeScript - Sales & CRM)
│   │   │   ├── 📄 store.tsx (React Context state management)
│   │   │   │   └─ Global lead/pipeline state
│   │   │   │
│   │   │   ├── 📄 types.ts (TypeScript interfaces)
│   │   │   │   └─ Lead, Pipeline, Template types
│   │   │   │
│   │   │   ├── 📄 templates.ts (Pre-built templates)
│   │   │   │   ├─ Email templates
│   │   │   │   └─ Pipeline templates
│   │   │   │
│   │   │   ├── 📄 parser.ts (Data parsing)
│   │   │   │   └─ CSV lead import, normalization
│   │   │   │
│   │   │   ├── 📄 mockData.ts (Sample data)
│   │   │   │
│   │   │   └── 📁 sales/ (8 sales components)
│   │   │       ├── 📄 CrmContextOverride.tsx
│   │   │       ├── 📄 LeadParserPanel.tsx (Lead import UI)
│   │   │       ├── 📄 LeadProfilePane.tsx (Lead detail view)
│   │   │       ├── 📄 OutreachComposer.tsx (Email composer)
│   │   │       ├── 📄 parser.ts (Parsing helpers)
│   │   │       ├── 📄 SalesCommandCenter.tsx (Main workspace)
│   │   │       ├── 📄 SalesInboxRail.tsx (Communication inbox)
│   │   │       └── 📄 templates.ts (Template management)
│   │   │
│   │   ├── 📁 lib/ (Utility libraries)
│   │   │   ├── 📄 api.js (100+ lines)
│   │   │   │   ├─ request(path, options) - Main fetch wrapper
│   │   │   │   ├─ Auto JWT injection
│   │   │   │   ├─ Multiple API base fallback
│   │   │   │   ├─ apiGet(), apiPost(), apiPut(), apiDelete()
│   │   │   │   └─ Smart error messages
│   │   │   │
│   │   │   ├── 📄 session.js (50 lines)
│   │   │   │   ├─ getSession() - Load from localStorage
│   │   │   │   ├─ setSession() - Save session
│   │   │   │   ├─ clearSession() - Logout
│   │   │   │   └─ getToken() - Extract JWT
│   │   │   │
│   │   │   ├── 📄 device.js (80 lines)
│   │   │   │   └─ Device fingerprinting utilities
│   │   │   │
│   │   │   └── 📄 cn.ts (20 lines)
│   │   │       └─ Classname merger (tailwind utilities)
│   │   │
│   │   ├── 📁 data/
│   │   │   └── 📄 chatbotKnowledge.json (500+ lines)
│   │   │       ├─ FAQ answers
│   │   │       ├─ Intent routing
│   │   │       └─ Context-specific knowledge
│   │   │
│   │   ├── 📁 assets/
│   │   │   └─ Images, logos, icons
│   │   │
│   │   ├── 📁 styles/
│   │   │   ├── 📄 index.css (Global styles)
│   │   │   ├── 📄 tailwind.css (@tailwind directives)
│   │   │   ├── 📄 App.css (App layout)
│   │   │   ├── 📄 component-specific.css files
│   │   │   └─ Scoped component styles
│   │   │
│   │   └── 📄 main.jsx (11 lines)
│   │       └─ React root render
│   │
│   └── 📁 node_modules/
│
├── 📁 docs/
│   ├── 📄 trust-scoring-spec.md (100+ lines)
│   │   ├─ Trust scoring formula
│   │   ├─ 6 base signals breakdown
│   │   ├─ Privacy-safe adjustments
│   │   ├─ Embedding near-duplicate logic
│   │   ├─ IP pattern adjustment
│   │   └─ Final score composition
│   │
│   └── 📄 embedding-service-api.md (50+ lines)
│       ├─ Service setup
│       ├─ API endpoints
│       ├─ Request/response formats
│       ├─ Persistence
│       └─ Model configuration
│
├── 📁 .git/
│   └─ Git repository history
│
└── 📁 node_modules/ (Root workspace dependencies)
    └─ concurrently (for parallel dev)
```

---

## QUICK REFERENCE - KEY FILES BY PURPOSE

### Trust Scoring Engine
- `backend/src/services/trustScoringService.js` - Score computation (6 signals)
- `backend/src/services/feedbackService.js` - Feedback pipeline
- `backend/src/services/embeddingService.js` - Duplicate detection
- `backend/src/services/ipIntelService.js` - IP geolocation & risk

### API Endpoints
- `backend/src/routes/auth.js` - Authentication (OTP login)
- `backend/src/routes/public.js` - Feedback submission & vendor profiles
- `backend/src/routes/vendor.js` - Vendor dashboard operations
- `backend/src/routes/admin.js` - System administration
- `backend/src/routes/support.js` - Support tickets & messages
- `backend/src/routes/leads.js` - CRM lead management

### Database Models
- `backend/src/models/Feedback.js` - Complex trust breakdown schema
- `backend/src/models/Vendor.js` - Business profile & settings
- `backend/src/models/Order.js` - Order & delivery tracking
- `backend/src/models/User.js` - Authentication records
- `backend/src/models/AdminActionLog.js` - Audit trail

### Frontend Pages
- `frontend/src/pages/HomePage.jsx` - Landing page
- `frontend/src/pages/VendorDashboard.jsx` - Vendor workspace (13 tabs)
- `frontend/src/pages/AdminDashboard.jsx` - Admin panel (11 tabs)
- `frontend/src/pages/TransparencyPage.jsx` - Technical documentation

### Frontend Features
- `frontend/src/components/Chatbot.jsx` - AI support bot
- `frontend/src/components/vendorDashboard/` - Dashboard components
- `frontend/src/components/vendorProfile/` - Profile editor
- `frontend/src/crm/sales/` - CRM pipeline

### Configuration & Utilities
- `backend/.env.example` - Backend configuration template
- `frontend/.env.example` - Frontend configuration template
- `backend/src/seed/seed.js` - Demo data generator
- `frontend/src/lib/api.js` - API client with retry logic
- `frontend/src/lib/session.js` - Session management

---

## DEPLOYMENT CHECKLIST

### Backend Requirements
- [ ] MongoDB Atlas connection string
- [ ] JWT_SECRET (cryptographically secure)
- [ ] SMTP credentials (for OTP emails)
- [ ] MaxMind GeoLite2 databases
- [ ] IPQualityScore API key (optional)
- [ ] Embedding service URL

### Frontend Requirements
- [ ] VITE_API_URL pointing to backend
- [ ] Build optimization enabled
- [ ] CORS origin whitelisted on backend

### Embedding Service (Python)
- [ ] Python 3.9+
- [ ] FAISS compiled for platform
- [ ] FastAPI running on separate port

---

**Total LOC Estimate:**
- Backend: ~3,500 lines
- Frontend: ~8,000 lines
- Python embedding: ~500 lines
- **Total: ~12,000 lines of code**

**Last Updated:** April 29, 2026 | **System Status:** Demo-Ready ✅
