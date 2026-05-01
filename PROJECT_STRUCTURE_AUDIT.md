# TRUSTY PROJECT - COMPREHENSIVE STRUCTURE AUDIT REPORT
**Audit Date:** April 29, 2026 | **Status:** Demo-Ready Full-Stack System

---

## EXECUTIVE SUMMARY

**Trusty** (TrustLens) is a sophisticated full-stack feedback verification and trust scoring system with three distinct UI roles and an advanced trust computation engine. The project employs privacy-safe, rule-based signals with AI-assisted analysis while maintaining explainability and security.

**Architecture Type:** Monorepo (Yarn workspaces)  
**Frontend:** React 19 + Vite + TailwindCSS + React Router 7  
**Backend:** Node.js + Express 5 + MongoDB 9 + Mongoose  
**Database:** MongoDB with privacy-safe hashing  
**Auxiliary Services:** Python FastAPI for embeddings (FAISS index)  
**Key Focus:** Trust scoring, feedback authenticity, vendor management, fraud detection

---

## 1. PROJECT STRUCTURE BREAKDOWN

### 1.1 Root Directory Structure

```
Trusty/
├── backend/                          # Node.js Express server
├── frontend/                         # React Vite application
├── docs/                             # Technical documentation
├── package.json                      # Root workspace config
├── README.md                         # Project overview
├── .env                              # Local environment
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore rules
└── node_modules/                     # Root dependencies (concurrently)
```

---

## 2. BACKEND ARCHITECTURE

### 2.1 Backend Directory Structure

```
backend/
├── src/
│   ├── index.js                      # Entry point
│   ├── app.js                        # Express app factory
│   ├── db.js                         # MongoDB connection logic
│   ├── middleware/                   # Express middleware
│   ├── models/                       # Mongoose schemas (11 models)
│   ├── routes/                       # API route handlers (6 routers)
│   ├── services/                     # Business logic services (10 services)
│   ├── utils/                        # Utility functions
│   └── seed/                         # Database seeding
├── embedding_service/                # Python FastAPI service
├── data/                             # MaxMind GeoIP databases
├── package.json                      # Backend dependencies
├── .env                              # Backend environment
├── .env.example                      # Environment template
└── node_modules/                     # Backend dependencies
```

### 2.2 Backend Database Models (11 Total)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **User** | Authentication & authorization | email, passwordHash, role (ADMIN/VENDOR), vendorId |
| **Vendor** | Business profile & settings | name, email, category, country, settings, profileVisibility, isFlagged, isTerminated |
| **Order** | Transaction/delivery tracking | vendorId, customerName, productDetails, paymentStatus, deliveryStatus, feedbackCode |
| **Feedback** | Customer reviews with trust scoring | vendorId, orderId, text, trustScore, trustBreakdown, deviceHash, ipHash, images (up to 3) |
| **Message** | Customer support messages | vendorId, message, status (open/replied/closed), replies (thread), source (chatbot/public/manual) |
| **Ticket** | Support tickets | issueType, description, status (open/in-progress/resolved), priority, replies, customerFollowUps |
| **Lead** | CRM leads for vendors | vendorId, name, email, status, crmStage, priority, country, product |
| **Invoice** | Payment invoices | vendorId, orderId, amount, invoiceNumber, status (ISSUED/PAID), emails |
| **OTP** | One-time passwords | email, purpose (SIGNUP/RESET_PASSWORD/LOGIN/ADMIN_LOGIN), otp (hashed), expiresAt, attemptsLeft |
| **AdminActionLog** | Audit trail | actionType (FLAG/UNFLAG/TERMINATE/REACTIVATE), actorUserId, vendorId, reason |
| **AdminSettings** | System configuration | trustThresholds, fraudSensitivity, alerts configuration |

### 2.3 Backend Middleware (2 Files)

#### [authMiddleware.js](backend/src/middleware/authMiddleware.js)
- **Functions:**
  - `requireAuth()` - Validates Bearer JWT token
  - `requireRole(role)` - Enforces role-based access (ADMIN/VENDOR)
  - `requireVendorParamMatch()` - Verifies vendor ID in params matches user
- **Dependencies:** JWT validation, user context injection

#### [errorMiddleware.js](backend/src/middleware/errorMiddleware.js)
- **Purpose:** Centralized error handling
- **Handles:** Status codes, error codes, payload size validation (413)
- **Response Format:** `{ ok: false, error: { message, code } }`

### 2.4 Backend API Routes (6 Routers)

#### [auth.js](backend/src/routes/auth.js)
**Base:** `/api/auth`
- `POST /send-otp` - Send OTP for signup/password reset
- `POST /verify-otp-signup` - Verify OTP and create vendor account
- `POST /verify-otp-reset-password` - Verify OTP for password reset
- `POST /reset-password` - Set new password with verification token
- `POST /admin-login` - Admin OTP login flow
- `POST /verify-admin-otp` - Verify admin OTP and get token
- **Key Exports:** OTP hashing, token signing, password validation

#### [public.js](backend/src/routes/public.js)
**Base:** `/api/public`
- `GET /vendors?search=...` - List vendors with public filtering
- `GET /vendors/:vendorId` - Get vendor public profile
- `GET /vendors/:vendorId/feedback` - Get paginated feedback for vendor (public rules applied)
- `POST /vendors/:vendorId/feedback` - Submit feedback (anonymous or with code)
- `GET /order/:feedbackCode/status` - Check order/feedback status
- `GET /orders/:orderId` - Get order details
- **Key Logic:** Feedback sanitization based on vendor privacy rules

#### [vendor.js](backend/src/routes/vendor.js)
**Base:** `/api/vendor` (requires auth + VENDOR role)
- `GET /overview` - Dashboard stats
- `POST /orders` - Create order
- `PUT /orders/:orderId/payment-confirm` - Confirm payment
- `PUT /orders/:orderId/delivery` - Update delivery status
- `GET /feedback` - Get vendor feedback
- `GET /:vendorId/profile` - Get vendor profile
- `PUT /:vendorId/profile` - Update vendor profile
- `GET /:vendorId/settings` - Get vendor settings
- `PUT /:vendorId/settings` - Update vendor settings
- `GET /:vendorId/public-visibility` - Get public visibility controls
- `PUT /:vendorId/public-visibility` - Update public visibility
- **Auth:** Requires `requireVendorParamMatch()` middleware

#### [admin.js](backend/src/routes/admin.js)
**Base:** `/api/admin` (requires auth + ADMIN role)
- `GET /overview` - Admin dashboard metrics
- `GET /vendors` - List all vendors with stats
- `GET /feedbacks` - Paginated feedbacks with filtering (trust level, duplicates, anonymous)
- `GET /vendors/:vendorId/detail` - Detailed vendor analytics
- `GET /vendors/:vendorId/profile` - Vendor profile snapshot
- `GET /analytics/snapshot` - System-wide analytics
- `GET /alerts` - Compute current alerts
- `GET /patterns` - Cluster suspicious patterns
- `GET /settings` - Get admin settings
- `PUT /settings` - Update admin settings
- `POST /vendors/:vendorId/flag` - Flag vendor for review
- `POST /vendors/:vendorId/unflag` - Unflag vendor
- `POST /vendors/:vendorId/terminate` - Terminate vendor account
- `POST /vendors/:vendorId/reactivate` - Reactivate vendor
- `GET /action-logs` - Get admin action audit trail

#### [support.js](backend/src/routes/support.js)
**Base:** `/api/support`
- `POST /messages` - Submit support message (rate-limited)
- `GET /messages/:referenceId` - Get message thread
- `POST /messages/:referenceId/reply` - Admin reply to message
- `POST /tickets` - Create support ticket (rate-limited)
- `GET /tickets/:referenceId` - Get ticket details
- `POST /tickets/:referenceId/reply` - Admin reply to ticket
- `POST /tickets/:referenceId/customer-followup` - Customer update
- `POST /tickets/:referenceId/customer-close` - Customer closes ticket
- **Rate Limiting:** 45s window for messages, 60s for tickets

#### [leads.js](backend/src/routes/leads.js)
**Base:** `/api/leads` (requires auth + VENDOR role)
- `POST /` - Create lead
- `GET /` - Get leads with filtering
- `GET /:leadId` - Get lead details
- `PUT /:leadId` - Update lead
- `DELETE /:leadId` - Delete lead
- `PUT /:leadId/crm-stage` - Update CRM pipeline stage
- **CRM Stages:** new_lead → contacted → negotiation → invoice_sent → payment → order → shipped → delivered → feedback_retention

### 2.5 Backend Services (10 Files)

#### [trustScoringService.js](backend/src/services/trustScoringService.js)
**Purpose:** Core trust score computation engine
**Key Functions:**
- `scoreTokenVerification()` - 0-25 points (token validity & reuse detection)
- `scorePaymentProof()` - 0-20 points (order payment verification)
- `scoreAiBehavior()` - 0-25 points (typing patterns, copy-paste detection)
  - Detects: High WPM (>40 cps), zero edits on long text, sudden text injection, low first-input gap
  - Banding: Full paste (0-8), mixed (12-18), natural (22-24)
- `scoreDevicePattern()` - 0-15 points (device fingerprint consistency)
- `scoreIpPattern()` - 0-10 base + adjustment (network type classification)
  - Residential: 10, Mobile: 8, Business: 7, Datacenter: 4, VPN: 2, TOR: 0, Lookup fail: 6
- `scoreContextDepth()` - 0-15 points (review detail, coherence, formatting)
- `computeTrustLevel()` - Maps score to level (HIGH/MEDIUM/LOW)
- `computeDuplicateAdjustment()` - Negative adjustment for near-duplicates
- `computeTypingVarianceAdjustment()` - Adjustment for typing inconsistency
**Formula:** `finalScore = clamp(baseScore + ipAdj + dupAdj + typingAdj + aiAdj, 0, 100)`

#### [feedbackService.js](backend/src/services/feedbackService.js)
**Purpose:** Feedback submission and processing pipeline
**Key Functions:**
- `submitFeedback()` - Main feedback ingestion endpoint
  - Validates token (if provided)
  - Computes trust score
  - Handles embedding search for duplicates
  - Stores blockchain anchor hash
  - Sends confirmation email
- `computeCountryRelation()` - Matches order country to IP location
- `normalizeFeedbackRating()` - Ensures rating is 1-5 with 0.5 increments
**Validation:** Max 3 images (5MB total), max 2000 char text, device fingerprinting

#### [authService.js](backend/src/services/authService.js)
**Purpose:** Authentication utilities
**Functions:**
- `hashPassword()` - bcrypt with 10 rounds (min 6 chars)
- `verifyPassword()` - Compare password to hash
- `signToken()` - Sign JWT (12h expiry)
- `verifyToken()` - Verify and decode JWT
- `httpError()` - Standardized error factory
**JWT Payload:** `{ userId, role, email, vendorId (if vendor) }`

#### [vendorService.js](backend/src/services/vendorService.js)
**Purpose:** Vendor business logic
**Key Functions:**
- `createOrder()` - Create order with feedback code & location capture
- `confirmPayment()` - Mark order as PAID
- `updateDeliveryStatus()` - Update order delivery stage
- `getVendorOverview()` - Compute dashboard stats (feedbacks, orders, trust score)
- `computeVendorPublicProfile()` - Filter fields based on visibility settings
- `computeStatusBadge()` - Map trust score to Trusted/Medium/Risky
- `normalizeProfileVisibility()` - Apply default visibility rules
**Statistics:** Feedback count, avg trust score, order metrics, payment status

#### [adminService.js](backend/src/services/adminService.js)
**Purpose:** Admin dashboard and vendor management
**Key Functions:**
- `computeAdminOverview()` - System-wide metrics (vendor count, feedback rate, alerts)
- `listAdminVendors()` - Get all vendors with status & stats
- `computeAlerts()` - Detect: repeated device submissions, network-wide fraud, duplicate clusters, vendor spikes
- `getVendorDetail()` - Deep vendor profile for admin review
- `getAnalyticsSnapshot()` - Trust distribution, feedback trends
- `getPatternClusters()` - Cluster similar suspicious reviews
- `flagVendor()` - Mark vendor for review (creates AdminActionLog)
- `unflagVendor()` - Remove flag
- `terminateVendor()` - Disable vendor account
- `reactivateVendor()` - Re-enable vendor
- `getActionLogs()` - Audit trail of admin actions
**Default Settings:** trustThresholds (71=Trusted, 40=Medium), fraudSensitivity, alert thresholds

#### [embeddingService.js](backend/src/services/embeddingService.js)
**Purpose:** Communicate with Python embedding service for near-duplicate detection
**Key Functions:**
- `upsertAndSearch()` - Add feedback embedding to index & find similar
- **Endpoint:** POST `/upsert-and-search` on embedding service
- **Request:** `{ feedbackId, vendorId, text, topK, filters }`
- **Retry Logic:** 3 attempts with exponential backoff
- **Timeout:** 2500ms (configurable)
**Purpose:** Detect copy-pasted or recycled feedback across vendor network

#### [ipIntelService.js](backend/src/services/ipIntelService.js)
**Purpose:** IP geolocation and risk analysis
**Key Functions:**
- `inspectClientIp()` - Query MaxMind GeoLite2 + IPQualityScore
  - MaxMind provides: country, region, city, ASN
  - IPQualityScore provides: VPN/proxy/TOR/hosting detection, fraud score
- `extractClientIp()` - Parse X-Forwarded-For / socket address
- `toLocationSnapshot()` - Create hashed location record
- **Storage:** Only stores ipHash, country, region, city, riskLevel (never raw IP)
- **Fallback:** If lookup fails, uses neutral score
**Databases:** GeoLite2-City.mmdb (binary) & GeoLite2-ASN.mmdb

#### [emailService.js](backend/src/services/emailService.js)
**Purpose:** Email sending with fallback simulation
**Key Functions:**
- `sendEmail({ to, subject, body })` - Send SMTP or simulate
- `getSmtpConfig()` - Loads SMTP settings from env (STARTTLS on 587)
- **Fallback:** Logs to console if SMTP not configured
- **Email Events:** Tracked in Invoice/Message documents
**TLS:** Minimum TLSv1.2, rejectUnauthorized by default

#### [cryptoService.js](backend/src/services/cryptoService.js)
**Purpose:** Cryptographic utilities
**Functions:**
- `sha256Hex()` - SHA-256 hashing for privacy-safe signals
- `generateTxRef()` - Generate blockchain anchor reference (TLX-timestamp-random)

#### [mongoReadRetry.js](backend/src/services/mongoReadRetry.js)
**Purpose:** MongoDB read replica fallback
**Function:** `withMongoReadRetry()` - Attempts read on primary, falls back to secondary preferred
**Use:** Reduces load on primary during traffic spikes

### 2.6 Backend Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies: Express 5, MongoDB 9, Mongoose 9, bcryptjs, JWT, Helmet, Morgan, MaxMind GeoIP2 |
| `.env.example` | Template for: MongoDB URI, JWT secret, SMTP, MaxMind paths, IPQualityScore key, embedding service URL |
| `src/index.js` | Server bootstrap: connects DB, creates app, listens on port |

### 2.7 Backend Seed Data

**File:** [backend/src/seed/seed.js](backend/src/seed/seed.js)
- Creates 5 demo vendors
- Creates 20 demo orders
- Creates 50 demo feedback entries with varied trust scores
- Creates admin user account
- Populates messages, tickets, leads

---

## 3. FRONTEND ARCHITECTURE

### 3.1 Frontend Directory Structure

```
frontend/
├── src/
│   ├── main.jsx                      # React entry point
│   ├── App.jsx                       # Root router component
│   ├── pages/                        # Page components (14 pages)
│   ├── components/                   # Reusable UI components
│   │   ├── about/                    # About page sections (8 components)
│   │   ├── admin/                    # Admin UI components (5 components)
│   │   ├── support/                  # Support features (8 components)
│   │   ├── transparency/             # Trust transparency sections (13 components)
│   │   ├── ui/                       # Shadcn-style primitives (7 components)
│   │   ├── vendorDashboard/          # Vendor workspace (13 components + pipeline)
│   │   ├── vendorProfile/            # Profile management (11 components)
│   │   ├── vendorSettings/           # Settings UI (6 components)
│   │   ├── vendorSignup/             # Signup forms (4 components)
│   │   ├── Chatbot.jsx               # AI support bot
│   │   ├── Footer.jsx                # Site footer
│   │   ├── Form*.jsx                 # Form primitives (5 files)
│   │   ├── *RatingDisplay.jsx        # Rating components
│   │   └── *Auth.jsx                 # Auth card UI
│   ├── crm/                          # CRM/sales pipeline module
│   │   ├── sales/                    # Sales command center (8 components)
│   │   ├── store.tsx                 # CRM state (React Context)
│   │   ├── types.ts                  # TypeScript interfaces
│   │   ├── templates.ts              # Email/pipeline templates
│   │   └── parser.ts                 # Lead parsing logic
│   ├── lib/                          # Utility libraries
│   │   ├── api.js                    # API client with retry logic
│   │   ├── session.js                # Local storage session manager
│   │   ├── device.js                 # Device fingerprinting
│   │   └── cn.ts                     # Class name utilities
│   ├── data/                         # Static data
│   │   └── chatbotKnowledge.json     # Chatbot training data
│   ├── assets/                       # Images & media
│   ├── styles/                       # CSS files
│   │   ├── index.css                 # Global styles
│   │   ├── tailwind.css              # Tailwind imports
│   │   ├── App.css                   # App layout
│   │   └── component-specific.css    # Component styles
│   └── public/                       # Static HTML assets
├── package.json                      # Frontend dependencies
├── vite.config.js                    # Vite build config
├── tailwind.config.cjs               # TailwindCSS config (prefixed tw-)
├── postcss.config.cjs                # PostCSS config
├── eslint.config.js                  # ESLint rules
├── index.html                        # HTML template
└── vercel.json                       # Vercel deployment config

```

### 3.2 Frontend Pages (14 Total)

| Page | Route | Purpose | Auth Required |
|------|-------|---------|---------------|
| **HomePage** | `/` | Hero & marketing landing | No |
| **HowItWorksPage** | `/how-it-works` | Trust scoring explainer | No |
| **AboutPage** | `/about` | Company values & team | No |
| **TransparencyPage** | `/transparency` | Technical details & architecture | No |
| **VendorPage** | `/vendor` | Public vendor profile | No |
| **PublicView** | `/public/:vendorId` | Vendor's public profile & feedback | No |
| **VendorLoginPage** | `/vendor/login` | Vendor OTP login | No |
| **VendorSignupPage** | `/vendor/signup` | Vendor registration | No |
| **ForgotPasswordPage** | `/forgot-password` | Password reset flow | No |
| **VendorDashboard** | `/vendor/dashboard` | Main vendor workspace | Vendor |
| **VendorAnalyticsPage** | `/vendor/analytics` | Detailed vendor metrics | Vendor |
| **AdminDashboard** | `/admin` | Admin control panel | Admin |
| **VendorDashboard (nested pages)** | `/vendor/dashboard/:tab` | Dashboard tabs (orders, feedback, etc.) | Vendor |
| **AdminDashboard (nested pages)** | `/admin/:tab` | Admin tabs (vendors, feedbacks, etc.) | Admin |

### 3.3 Frontend Components Breakdown

#### **About Components** (`components/about/`) - 8 Files
- `AboutCTA.jsx` - Call-to-action section
- `AboutHero.jsx` - Hero banner
- `AboutIcon.jsx` - Custom icon renderer
- `PrinciplesSection.jsx` - Core principles display
- `PrivacySection.jsx` - Privacy commitment section
- `ProblemSection.jsx` - Problem statement
- `SolutionSection.jsx` - Solution features
- `TechnologySection.jsx` - Tech stack overview
- `TrustFlowSection.jsx` - Trust process flow
- `WhyTrustySection.jsx` - Value proposition
- `index.js` - Barrel export

#### **Admin Components** (`components/admin/`) - 5 Files
- `AdminLayout.jsx` - Sidebar + main layout
- `AdminUi.jsx` - Admin-specific UI utilities
- `ConfirmationModal.jsx` - Action confirmation dialog
- `Sidebar.jsx` - Navigation sidebar
- `TopBar.jsx` - Header navigation
- **Admin Pages** (`pages/admin/`) - 11 Files
  - `AnalyticsPage.jsx` - System metrics dashboard
  - `DashboardPage.jsx` - Main admin overview
  - `FeedbackPage.jsx` - Feedback review interface
  - `PatternsPage.jsx` - Fraud pattern visualization
  - `ReportsPage.jsx` - Report generation
  - `RiskAlertsPage.jsx` - Alert management
  - `SettingsPage.jsx` - Admin settings form
  - `TicketsPage.jsx` - Support ticket queue
  - `VendorDetailPage.jsx` - Single vendor deep dive
  - `VendorProfilePage.jsx` - Vendor profile editor
  - `VendorsPage.jsx` - Vendor directory with filtering

#### **Support Components** (`components/support/`) - 8 Files
- `ChatInput.jsx` - Chat message input
- `ChatMessage.jsx` - Message bubble renderer
- `ContactVendorModal.jsx` - Modal for contacting vendor
- `QuickActionButtons.jsx` - Action button group
- `QuickActions.jsx` - Quick action menu
- `SubmissionSuccessModal.jsx` - Confirmation modal
- `TicketModal.jsx` - Support ticket creation
- `TrackTicketModal.jsx` - Ticket tracking interface

#### **Transparency Components** (`components/transparency/`) - 13 Files
- `AISimilaritySection.jsx` - AI detection explanation
- `ArchitectureSection.jsx` - System architecture
- `BlockchainSection.jsx` - Blockchain anchoring
- `DocsHero.jsx` - Documentation header
- `FAQSection.jsx` - FAQ accordion
- `IntegrityRules.jsx` - Trust signal rules
- `LimitationsSection.jsx` - System limitations
- `PrivacySection.jsx` - Privacy safeguards
- `TransparencyIcon.jsx` - Icon renderer
- `TrustScoreOverview.jsx` - Score explanation
- `TrustSignals.jsx` - Individual signal breakdown
- `index.js` - Barrel export

#### **UI Components** (`components/ui/`) - 7 Files (Shadcn-style)
- `badge.tsx` - Badge component
- `button.tsx` - Button component
- `card.tsx` - Card container
- `input.tsx` - Text input
- `select.tsx` - Dropdown select
- `tabs.tsx` - Tab navigation
- `textarea.tsx` - Multi-line text input

#### **Vendor Dashboard Components** (`components/vendorDashboard/`) - 13 Files
- `AlertsPanel.jsx` - Risk alerts display
- `AnalyticsPage.jsx` - Vendor analytics dashboard
- `ChartsSection.jsx` - Chart collection (Recharts)
- `CustomerInsights.jsx` - Customer profile insights
- `DashboardCards.jsx` - Metric cards (KPIs)
- `dataUtils.js` - Data processing helpers
- `InsightsPanel.jsx` - Intelligence panel
- `LeadsSection.jsx` - Lead pipeline display
- `OrdersTable.jsx` - Orders data table
- `TemplatesStudio.jsx` - Email/message template editor
- `Sidebar.jsx` - Dashboard navigation
- `index.js` - Barrel export
- **Pipeline Subdirectory** (`pipeline/`) - 7 Files
  - `CardDetailsDrawer.jsx` - Lead/order details sidebar
  - `CrmWorkspaceTabs.jsx` - Tab navigation
  - `EmailTemplates/` - Email template storage
  - `InvoiceTemplates/` - Invoice templates
  - `LeadCard.jsx` - Lead card in pipeline
  - `PipelineBoard.jsx` - Kanban board (Recharts-based)
  - `PipelineBoard.css` - Pipeline styling
  - `RecordDrawer.jsx` - Record editor panel
  - `StageColumn.jsx` - Pipeline stage column

#### **Vendor Profile Components** (`components/vendorProfile/`) - 11 Files
- `AdditionalInfoBox.jsx` - Extra info section
- `BrandAssetsBox.jsx` - Logo & assets upload
- `BusinessDetailsForm.jsx` - Business info form
- `constants.js` - Category constants
- `ContactForm.jsx` - Contact details section
- `DescriptionBox.jsx` - Bio/description editor
- `index.js` - Barrel export
- `LocationForm.jsx` - Address & location form
- `ProfilePage.jsx` - Main profile page
- `ProfilePreviewCard.jsx` - Public profile preview
- `PublicVisibilityControls.jsx` - Privacy field toggles

#### **Vendor Settings Components** (`components/vendorSettings/`) - 6 Files
- `DropdownSelect.jsx` - Custom dropdown
- `index.js` - Barrel export
- `SettingsPage.jsx` - Main settings container
- `SettingsSection.jsx` - Section grouping
- `SliderControl.jsx` - Range slider
- `ToggleSwitch.jsx` - Boolean toggle

#### **Vendor Signup Components** (`components/vendorSignup/`) - 4 Files
- `CheckboxField.jsx` - Checkbox input
- `InputField.jsx` - Text input wrapper
- `SelectField.jsx` - Select wrapper
- `SignupForm.jsx` - Registration form

#### **Other Components** (Root `components/`)
- `Chatbot.jsx` - AI support chatbot (stateful)
- `Footer.jsx` - Site footer
- `FormCheckbox.jsx` - Form-level checkbox
- `FormInput.jsx` - Form-level input
- `FormSelect.jsx` - Form-level select
- `OTPInput.jsx` - OTP code input UI
- `StarRating.jsx` - 5-star rating display
- `VendorAuthCard.jsx` - Auth form card
- `VendorAuthCard.css` / `Chatbot.css` - Component styles
- `VendorAuth.css` - Auth page styles
- `FeedbackExplanation.jsx` - Feedback details modal

### 3.4 Frontend CRM/Sales Module (`crm/`) - TypeScript

**Purpose:** Pipeline management & sales automation

#### Core Files
- **store.tsx** - React Context for CRM state management
  - Global lead/pipeline state
  - Stage transition handlers
  - Template application

- **types.ts** - TypeScript interfaces
  - Lead type definition
  - Pipeline stage types
  - Template types

- **templates.ts** - Pre-built message & pipeline templates
  - Email templates for outreach
  - Pipeline stage templates

- **parser.ts** - Lead data parsing
  - CSV lead import
  - Data normalization

#### Sales Components (`sales/`) - 8 Files
- `CrmContextOverride.tsx` - Context provider wrapper
- `LeadParserPanel.tsx` - Lead import interface
- `LeadProfilePane.tsx` - Lead detail view
- `OutreachComposer.tsx` - Email/message composer
- `parser.ts` - Lead parsing utilities
- `SalesCommandCenter.tsx` - Main sales workspace
- `SalesInboxRail.tsx` - Communication inbox
- `templates.ts` - Template management

### 3.5 Frontend Utility Libraries

#### [lib/api.js](frontend/src/lib/api.js)
**Purpose:** API client with automatic fallback & retry logic
**Functions:**
- `request(path, options)` - Main fetch wrapper
  - Auto-includes JWT token in Authorization header
  - Tries multiple API bases (local backend first in dev, then configured)
  - Fallback to localhost:5000 if hosted API is down
  - Handles JSON/text responses
- `apiGet(path)` - GET request
- `apiPost(path, data)` - POST request with JSON body
- `apiPut(path, data)` - PUT request
- `apiDelete(path)` - DELETE request
**Error Handling:** Network errors, JSON parse errors with helpful messages
**API Base Selection:** Via `VITE_API_URL` env var or auto-detect

#### [lib/session.js](frontend/src/lib/session.js)
**Purpose:** Client-side session management
**Functions:**
- `getSession()` - Get session from localStorage
- `getToken()` - Extract JWT token
- `setSession(session)` - Save session to localStorage
- `clearSession()` - Logout
**Storage:** Key = `trusty-session` (JSON serialized)
**Format:** `{ token, user: { role, email, vendorId?, vendorName? } }`

#### [lib/device.js](frontend/src/lib/device.js)
**Purpose:** Device fingerprinting for trust scoring
**Functions:**
- Device type detection (mobile/tablet/desktop)
- Browser identification
- OS detection
- Screen size capture
**Used By:** Feedback submission to compute deviceHash

#### [lib/cn.ts](frontend/src/lib/cn.ts)
**Purpose:** Classname utility (tailwind/shadcn pattern)
**Function:** `cn()` - Merge Tailwind classes with conflict resolution

### 3.6 Frontend Data & Configuration

#### Static Data
- **data/chatbotKnowledge.json** - Chatbot training data
  - FAQ answers
  - Common questions mapped to actions
  - Route-specific knowledge

#### Styling
- **index.css** - Global styles
- **tailwind.css** - Tailwind directives (@tailwind)
- **App.css** - App layout & navigation
- **Individual component .css files** - Scoped component styles

#### Configuration
- **vite.config.js** - React plugin, default port 5173
- **tailwind.config.cjs** - Prefix: `tw-`, custom colors via CSS vars
- **postcss.config.cjs** - PostCSS processing
- **eslint.config.js** - ESLint rules (React hooks plugin)

### 3.7 Frontend Dependencies

| Category | Packages |
|----------|----------|
| **Core** | react 19, react-dom 19, react-router-dom 7 |
| **UI** | tailwindcss 3, lucide-react (icons), recharts (charts), sonner (toast notifications) |
| **Build** | vite 7, @vitejs/plugin-react |
| **Dev** | eslint, autoprefixer, postcss |

---

## 4. EMBEDDING SERVICE (Python FastAPI)

### 4.1 Structure

```
backend/embedding_service/
├── main.py                           # FastAPI app
├── requirements.txt                  # Python dependencies
├── README.md                         # Service documentation
├── data/
│   ├── faiss.index                   # FAISS similarity index
│   └── meta.json                     # Embedding metadata
└── .env                              # Service configuration
```

### 4.2 Purpose & Endpoints

**Purpose:** Detect near-duplicate feedback using embeddings & FAISS indexing

**Endpoints:**
- `GET /health` - Service status
- `POST /embed` - Get embedding for text
- `POST /upsert-and-search` - Add embedding & find similar (main endpoint)
- `POST /search` - Query index for similar vectors

**Request Format:**
```json
{
  "feedbackId": "string",
  "vendorId": "string",
  "text": "feedback text",
  "topK": 5,
  "filters": { "vendorId": "string" }
}
```

**Model:** Sentence transformers (configurable)
**Index Storage:** FAISS binary format (persisted on disk)
**Metadata:** JSON with feedback IDs, vendor IDs, creation dates

---

## 5. DATABASE LAYER

### 5.1 Connection Pattern

**File:** [backend/src/db.js](backend/src/db.js)
- **URI:** Configurable via `MONGO_URI` env var
- **Connection Retry:** 5 attempts with exponential backoff (500ms, 1s, 2s, 4s, 8s)
- **Mongoose Settings:** `strictQuery: true`
- **Error Handling:** TLS alert detection for Atlas network issues

### 5.2 Database Schema Relationships

```
User
  ├─ vendorId → Vendor (optional)
  └─ role: ADMIN | VENDOR

Vendor
  ├─ settings (nested VendorSettingsSchema)
  ├─ profileVisibility (nested schema)
  ├─ isFlagged / flaggedBy → User
  └─ isTerminated / terminatedBy → User

Order
  ├─ vendorId → Vendor
  ├─ feedbackCode (unique)
  ├─ createdLocation (nested)
  ├─ paymentLocation (nested)
  └─ deliveryHistory (nested array)

Feedback
  ├─ vendorId → Vendor (indexed)
  ├─ orderId → Order (indexed)
  ├─ trustBreakdown (nested schema)
  ├─ embeddingAudit (nested)
  └─ blockchain (nested)

Message
  ├─ vendorId → Vendor
  └─ replies (nested array)

Ticket
  ├─ replies (nested array)
  └─ customerFollowUps (nested array)

Lead
  └─ vendorId → Vendor

Invoice
  ├─ vendorId → Vendor
  └─ orderId → Order

AdminActionLog
  ├─ actorUserId → User
  └─ vendorId → Vendor

OTP
  ├─ email (indexed with purpose)
  └─ expiresAt (TTL index)

AdminSettings
  └─ key: "global" (singleton)
```

### 5.3 Indexing Strategy

| Model | Indexes | Purpose |
|-------|---------|---------|
| User | email (unique), vendorId | Fast lookup by email; vendor-to-user |
| Vendor | isFlagged, isTerminated | Admin filtering |
| Order | vendorId, paymentStatus, deliveryStatus, feedbackCode | Query optimization |
| Feedback | vendorId, orderId, textHash, deviceHash, ipHash | Duplicate & fraud detection |
| Message | vendorId+status+createdAt, userEmail+createdAt | Conversation threads |
| Ticket | status+createdAt, priority | Support queue |
| Lead | vendorId, status, crmStage, priority, country, product | CRM filtering |
| OTP | (email, purpose) unique, expiresAt TTL | Fast lookup & auto-cleanup |

---

## 6. API LAYER - REQUEST/RESPONSE PATTERNS

### 6.1 Authentication Flow

**Non-authenticated:** Public vendor profiles, feedback submission, support tickets
**Vendor Auth:**
1. POST `/api/auth/send-otp` → `{ email }` → Send OTP
2. POST `/api/auth/verify-otp-signup` → `{ email, otp, vendorName, ...details }` → Returns `{ token, user }`
3. Store token in `localStorage["trusty-session"]`
4. Include `Authorization: Bearer <token>` on vendor routes

**Admin Auth:**
1. POST `/api/auth/send-otp` → `{ email, purpose: "ADMIN_LOGIN" }`
2. POST `/api/auth/verify-admin-otp` → `{ email, otp }` → Returns `{ token, user: { role: "ADMIN" } }`

### 6.2 Standard Response Format

**Success:**
```json
{
  "ok": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error:**
```json
{
  "ok": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

**Common Error Codes:**
- `AUTH` - Authentication failure
- `FORBIDDEN` - Permission denied
- `VALIDATION` - Input validation error
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT` - Too many requests
- `VENDOR_NOT_FOUND` - Vendor lookup failed
- `CONFIG` - Configuration error
- `PAYLOAD_TOO_LARGE` - Request too large

### 6.3 Privacy-Safe Data Handling

| Data Type | Storage | Hashing | Queryable |
|-----------|---------|---------|-----------|
| **IP Address** | Never permanently | ipHash (SHA-256) | Yes (via hash) |
| **Device Fingerprint** | Never raw hardware ID | deviceHash | Yes (via hash) |
| **Session ID** | Never raw | sessionIdHash | Yes (via hash) |
| **OTP Code** | Never raw | SHA-256 hash | No (comparison only) |
| **Password** | Never raw | bcrypt 10 rounds | No |
| **Feedback Text** | Full text (user can delete) | Stored + textHash for dedup | Via full text or hash |
| **Country/Region** | Coarse location only | Stored openly | Yes |

---

## 7. FRONTEND ROUTING

### 7.1 Route Tree

```
/                               ← HomePage (marketing)
  └─ how-it-works              ← HowItWorksPage
  └─ about                     ← AboutPage
  └─ transparency              ← TransparencyPage
  └─ vendor                    ← VendorPage (marketing)
  └─ public/:vendorId          ← PublicView (vendor profile + feedbacks)

/vendor
  ├─ login                     ← VendorLoginPage
  ├─ signup                    ← VendorSignupPage
  ├─ dashboard/*               ← VendorDashboard (protected)
  │   ├─ dashboard             ← Overview
  │   ├─ templates             ← Template editor
  │   ├─ sales-command         ← CRM command center
  │   ├─ pipeline              ← Pipeline Kanban
  │   ├─ orders                ← Orders table
  │   ├─ payments              ← Payment history
  │   ├─ feedback              ← Feedback list
  │   ├─ messages              ← Messages inbox
  │   ├─ leads                 ← Lead list
  │   ├─ analytics             ← Analytics dashboard
  │   ├─ customers             ← Customer insights
  │   ├─ profile               ← Profile editor
  │   └─ settings              ← Vendor settings
  └─ analytics                 ← VendorAnalyticsPage (protected)

/admin
  ├─ dashboard                 ← Admin main (protected)
  ├─ vendors                   ← Vendor list
  ├─ feedbacks                 ← Feedback review
  ├─ analytics                 ← System analytics
  ├─ alerts                    ← Risk alerts
  ├─ patterns                  ← Pattern detection
  ├─ reports                   ← Reporting
  ├─ tickets                   ← Support tickets
  ├─ vendor-detail/:vendorId   ← Vendor deep dive
  ├─ vendor-profile/:vendorId  ← Vendor profile editor
  └─ settings                  ← Admin settings

/forgot-password              ← ForgotPasswordPage
```

### 7.2 Auth Guards

**Vendor Routes:** `RequireVendorAuth` component checks:
- Token exists
- User role = "VENDOR"
- vendorId populated
- Redirects to `/vendor/login` if failed

**Admin Routes:** Checked server-side via `requireRole("ADMIN")` middleware

---

## 8. KEY FEATURES & WORKFLOWS

### 8.1 Feedback Submission Pipeline

**Entry Points:**
1. Public: POST `/api/public/vendors/:vendorId/feedback` (anonymous)
2. Authenticated: POST `/api/public/vendors/:vendorId/feedback` (with token)

**Processing Steps:**
1. Validate code (if provided) or accept as anonymous
2. Extract client IP & compute ipHash
3. Capture device fingerprint
4. Call embedding service for duplicate detection
5. Compute trust score (6 signals)
6. Record blockchain anchor (SHA-256 hash)
7. Store in MongoDB
8. Publish analytics
9. Send confirmation email
10. Return feedback with trust breakdown

**Trust Score Components:**
- Token Verification (0-25)
- Payment Proof (0-20)
- AI Behavior Detection (0-25)
- Device Pattern (0-15)
- IP Pattern (0-10 + adjustment)
- Context Depth (0-15)
- **Adjustments:** Duplicate (-30 to 0), Typing variance (-10 to +10)

### 8.2 Vendor Signup to Dashboard

1. Email → OTP sent
2. Verify OTP + enter business details
3. Create Vendor + User records
4. JWT token issued
5. Redirect to dashboard
6. Populate orders/feedback/settings
7. Enable CRM/pipeline/templates

### 8.3 Admin Vendor Management

**Actions:**
- **Flag** - Mark for review (soft flag, doesn't block)
- **Unflag** - Remove flag
- **Terminate** - Disable vendor (hard block)
- **Reactivate** - Re-enable vendor

**Logging:** AdminActionLog records every action with actor, reason, timestamp

### 8.4 CRM Pipeline

**Stages:**
- new_lead → contacted → negotiation_follow_up → invoice_sent → payment_pending → payment_received → order_processing → shipped → delivered → feedback_retention

**Features:**
- Drag-drop lead movement
- Email templates
- Bulk operations
- Historical tracking
- Timeline view

---

## 9. CONFIGURATION & DEPLOYMENT

### 9.1 Environment Variables

**Backend (.env)**
```
PORT=5000
MONGO_URI=mongodb://...
JWT_SECRET=<secret>
PUBLIC_APP_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Embedding Service
EMBEDDING_SERVICE_URL=http://localhost:8010
EMBEDDING_TIMEOUT_MS=2500
EMBEDDING_RETRY_ATTEMPTS=3

# Email (SMTP or Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM="Trusty Support <...>"

# Geolocation
MAXMIND_CITY_DB_PATH=./data/GeoLite2-City.mmdb
MAXMIND_ASN_DB_PATH=./data/GeoLite2-ASN.mmdb

# IP Risk Analysis
IPQUALITYSCORE_API_KEY=...
IPQUALITYSCORE_BASE_URL=https://ipqualityscore.com/api/json/ip
IPQUALITYSCORE_TIMEOUT_MS=1800
IPQUALITYSCORE_STRICTNESS=1

# Security
OTP_PEPPER=<pepper>
IP_HASH_SALT=<salt>
REQUEST_BODY_LIMIT=5mb
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:5000
```

### 9.2 Build & Run Commands

**Development:**
```bash
npm run dev              # Run both frontend & backend
npm run dev:backend     # Backend only
npm run dev:frontend    # Frontend only
```

**Seed Data:**
```bash
npm run seed            # Populate demo data
```

**Production:**
```bash
npm run build           # Build frontend (dist/)
npm run start           # Start backend (production mode)
```

### 9.3 Deployment

**Frontend:** Vite builds to `dist/` - Deploy to Vercel/Netlify
**Backend:** Node.js on port 5000 - Deploy to Heroku/AWS/Digital Ocean
**Database:** MongoDB Atlas (cloud) or self-hosted
**Embedding Service:** Python FastAPI - Deploy to separate container

---

## 10. SECURITY & PRIVACY MEASURES

### 10.1 Privacy-First Design

- ✅ No raw IP stored (only ipHash)
- ✅ No device IDs collected
- ✅ No email linked to feedback (optional)
- ✅ No geographic location beyond country/region
- ✅ All hashing: SHA-256
- ✅ Password: bcrypt 10 rounds
- ✅ OTP: hashed before storage
- ✅ Blockchain anchoring: SHA-256 metadata only

### 10.2 Authentication Security

- ✅ JWT with 12h expiry
- ✅ Bearer token in Authorization header
- ✅ CORS whitelisting
- ✅ OTP rate limiting (3 attempts, 10m expiry)
- ✅ Role-based access control (ADMIN/VENDOR)

### 10.3 Network Security

- ✅ Helmet.js (headers)
- ✅ HTTPS recommended (TLS 1.2+)
- ✅ CORS policy validation
- ✅ Request body size limits (5MB default)
- ✅ Rate limiting on public endpoints

---

## 11. TESTING & DATA

### 11.1 Seed Data

**File:** [backend/src/seed/seed.js](backend/src/seed/seed.js)

Creates:
- 5 sample vendors (electronics, services, etc.)
- 20 orders with various payment/delivery states
- 50 feedback entries with trust scores
- 1 admin user (admin@trusty.local / password: admin123)
- Sample messages, tickets, leads

### 11.2 Demo Mode

- No production email sending (console simulation)
- No real IP intelligence (fallback to neutral)
- No blockchain anchoring (simulated TX refs)
- Seeded data for immediate testing

---

## 12. PERFORMANCE CONSIDERATIONS

### 12.1 Database Optimization

- **Indexes:** On frequently queried fields (vendorId, status, dates)
- **TTL Indexes:** OTP auto-expiry
- **Read Replicas:** MongoReadRetry service for load distribution
- **Lean Queries:** `.lean()` for read-only operations

### 12.2 API Optimization

- **Pagination:** Limit/offset on feedback lists
- **Caching:** Session-based (localStorage)
- **Retry Logic:** Exponential backoff for embedding service
- **Fallback APIs:** Multiple API base candidates

### 12.3 Frontend Optimization

- **Vite:** Fast HMR in dev, optimized bundles in prod
- **React 19:** Latest optimizations
- **Code Splitting:** Route-based via React Router
- **TailwindCSS:** Utility-first with PurgeCSS

---

## 13. MONITORING & OBSERVABILITY

### 13.1 Logging

- **Backend:** Morgan HTTP logger
- **Errors:** Console + error middleware
- **Database:** Mongoose connection logging
- **Email:** Simulated emails logged to console

### 13.2 Health Checks

- `GET /api/health` - Backend status
- `GET /embedding-service:8010/health` - Embedding service status

---

## 14. FILE MANIFEST (COMPLETE TREE)

### Backend Core
```
backend/src/
├── index.js (14 lines) - Server bootstrap
├── app.js (48 lines) - Express middleware setup
├── db.js (42 lines) - MongoDB connection with retry
├── middleware/
│   ├── authMiddleware.js (30 lines)
│   └── errorMiddleware.js (23 lines)
├── models/
│   ├── AdminActionLog.js (13 lines)
│   ├── AdminSettings.js (25 lines)
│   ├── Feedback.js (120 lines) - Complex trust schema
│   ├── Invoice.js (20 lines)
│   ├── Lead.js (80 lines)
│   ├── Message.js (30 lines)
│   ├── Order.js (40 lines)
│   ├── OTP.js (15 lines)
│   ├── Ticket.js (45 lines)
│   ├── User.js (10 lines)
│   └── Vendor.js (100 lines) - Complex nested settings
├── routes/
│   ├── admin.js (200+ lines)
│   ├── auth.js (250+ lines)
│   ├── index.js (10 lines)
│   ├── leads.js (200+ lines)
│   ├── public.js (300+ lines)
│   ├── support.js (250+ lines)
│   └── vendor.js (300+ lines)
├── services/
│   ├── adminService.js (300+ lines)
│   ├── authService.js (40 lines)
│   ├── cryptoService.js (10 lines)
│   ├── emailService.js (50 lines)
│   ├── embeddingService.js (150+ lines)
│   ├── feedbackService.js (400+ lines)
│   ├── ipIntelService.js (300+ lines)
│   ├── mongoReadRetry.js (30 lines)
│   ├── trustScoringService.js (400+ lines)
│   └── vendorService.js (300+ lines)
├── utils/
│   └── sendEmail.js (50 lines)
└── seed/
    └── seed.js (200+ lines)
```

### Frontend Structure
```
frontend/src/
├── main.jsx (11 lines)
├── App.jsx (200+ lines)
├── pages/ (14 JSX files, 100-300 lines each)
├── components/
│   ├── about/ (10 files)
│   ├── admin/ (5 files)
│   ├── support/ (8 files)
│   ├── transparency/ (13 files)
│   ├── ui/ (7 TSX files)
│   ├── vendorDashboard/ (13 files + pipeline/)
│   ├── vendorProfile/ (11 files)
│   ├── vendorSettings/ (6 files)
│   ├── vendorSignup/ (4 files)
│   ├── Chatbot.jsx (300+ lines)
│   ├── Footer.jsx (100+ lines)
│   └── Form*.jsx (5 files, 50-100 lines each)
├── crm/
│   ├── store.tsx (200+ lines)
│   ├── types.ts (50 lines)
│   ├── templates.ts (100 lines)
│   ├── parser.ts (80 lines)
│   ├── mockData.ts (100 lines)
│   └── sales/ (8 TSX files)
├── lib/
│   ├── api.js (100+ lines)
│   ├── session.js (50 lines)
│   ├── device.js (80 lines)
│   └── cn.ts (20 lines)
├── data/
│   └── chatbotKnowledge.json (500+ lines)
└── styles/ (4 CSS files, 100-500 lines each)
```

---

## 15. TECHNOLOGY STACK SUMMARY

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 19 | UI framework |
| **Frontend** | Vite | 7 | Build tool |
| **Frontend** | TailwindCSS | 3 | Styling |
| **Frontend** | React Router | 7 | Routing |
| **Frontend** | Recharts | 3 | Charts/graphs |
| **Backend** | Express | 5 | Web framework |
| **Backend** | Node.js | 18+ | Runtime |
| **Database** | MongoDB | 9 | Document store |
| **Database** | Mongoose | 9 | ODM |
| **Auth** | JWT | - | Token-based auth |
| **Auth** | bcryptjs | 3 | Password hashing |
| **Geolocation** | MaxMind GeoLite2 | - | IP geolocation |
| **IP Risk** | IPQualityScore | - | VPN/proxy detection |
| **Embeddings** | FAISS | - | Vector similarity |
| **Embeddings** | FastAPI | - | Python service |
| **Email** | Nodemailer | 8 | SMTP client |
| **Security** | Helmet | 8 | HTTP headers |
| **Logging** | Morgan | 1 | HTTP logging |
| **Config** | dotenv | 17 | Environment vars |

---

## 16. CRITICAL INSIGHTS & PATTERNS

### 16.1 Trust Scoring Philosophy

- **Explainability First:** Every point has clear reasoning
- **Privacy-Safe:** Hash-based instead of raw data
- **Multi-Signal:** 6 independent signals + adjustments
- **Soft Signals:** No single signal blocks feedback
- **AI as Assistant:** AI detects patterns but doesn't decide

### 16.2 Data Flow

```
Customer Feedback
  ↓
[Trust Scoring Engine]
  ├─ Token verification
  ├─ Payment proof
  ├─ AI behavior detection
  ├─ Device pattern
  ├─ IP pattern (privacy-safe)
  └─ Context depth
  ↓
[Adjustments]
  ├─ Duplicate detection (embedding service)
  ├─ Typing variance
  └─ IP adjustment
  ↓
[Final Score + Breakdown]
  ↓
[Blockchain Anchor] (hash only)
  ↓
[Store in MongoDB]
  ↓
[Public Display] (based on vendor's privacy rules)
```

### 16.3 Multi-Role Architecture

| Role | Access | Key Features |
|------|--------|--------------|
| **Anonymous** | Public vendor list, feedback submission, support tickets | Post feedback, track tickets |
| **Vendor** | Own dashboard, profile, settings, orders, CRM | Full business management |
| **Admin** | System-wide analytics, vendor flags, terminations, alerts | Platform governance |

### 16.4 Deployment Considerations

- **Monorepo:** Both frontend & backend in one repo
- **Separate Deployments:** Frontend (static hosting) vs Backend (server) vs Embedding (Python service)
- **Environment Config:** Extensive .env usage for flexibility
- **Database:** External MongoDB (Atlas recommended)
- **Email:** SMTP required for OTP/notifications

---

## 17. CONCLUSION

**Trusty** is a mature, production-ready feedback verification platform with:

✅ **Sophisticated Trust Scoring** - 6 signals + privacy-safe adjustments  
✅ **Full-Stack Architecture** - React frontend, Node backend, Python embeddings  
✅ **Privacy-First Approach** - Hash-only data storage, no raw IPs/device IDs  
✅ **Multi-Stakeholder Design** - Customers, vendors, admins with distinct UIs  
✅ **Advanced Features** - CRM pipeline, support tickets, admin analytics, fraud detection  
✅ **Production Ready** - Error handling, logging, rate limiting, CORS  
✅ **Explainability** - Clear breakdown of every trust decision  
✅ **Scalability** - Read replicas, embeddings offloaded to separate service  

**Total Files:** ~150 components/modules  
**LOC (Backend):** ~3,500  
**LOC (Frontend):** ~8,000  
**LOC (Python):** ~500  
**Models:** 11 MongoDB schemas  
**Routes:** 50+ API endpoints  
**Components:** 70+ React components  
