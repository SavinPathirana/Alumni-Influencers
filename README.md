# Alumni Influencers Platform

**Student:** Savin Pathirana — w1985684 / 20222009  
**Module:** Advanced Server-Side Web Programming  
**Coursework:** CW1 (Alumni API) + CW2 (University Analytics Dashboard)

---

## 1. Project Overview

Alumni Influencers is a full-stack web application built for a university to track, showcase, and analyse alumni career data. The system combines a secure RESTful API (CW1) with an interactive analytics dashboard (CW2) in a single monolithic Express.js application.

**Key Concept:** Alumni compete via a *blind bidding system* to be featured as "Alumni of the Day" — a public-facing showcase of their profile. Sponsors can fund alumni bids by making sponsorship offers tied to specific certifications, licences, or professional courses.

---

## 2. Features

### CW1 — Alumni Influencers API
- **Registration & Authentication** — university domain email (.ac.uk), bcrypt (12 rounds), email verification tokens, password reset with 1-hour expiry
- **Complete Profile Management** — CRUD for degrees, certifications, professional licences, professional courses, employment history, bio, LinkedIn URL, profile image upload, completion tracking
- **Blind Bidding System** — place/update/cancel bids, increase-only updates, monthly 3-win limit, automated daily winner selection (cron), win/lose email notifications
- **API Key Management** — generate, list, revoke, renew, permission-scoped keys (`read:alumni`, `read:analytics`, `read:alumni_of_day`), usage tracking with endpoint logging
- **Public Featured API** — `GET /api/featured/today` returns Alumni of the Day with full profile
- **Swagger Documentation** — interactive API docs at `/api-docs`

### CW2 — University Analytics Dashboard
- **Dashboard** — 13 interactive charts powered by Chart.js (bar, line, pie, doughnut, radar, polar area, stacked bar)
- **Alumni Filtering** — filter by programme, graduation year, industry sector
- **Browse Alumni** — paginated table with detail modal, sponsor integration
- **Export & Reports** — CSV export, PDF report (jsPDF), individual chart PNG download, custom report with chart selection, filter presets
- **Responsive UI** — mobile sidebar drawer, adaptive grid, Inter font, X/Twitter-inspired dark theme

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js |
| **Framework** | Express.js 5.x |
| **View Engine** | EJS (server-side rendering) |
| **Database** | MySQL via Sequelize ORM |
| **Authentication** | JWT (jsonwebtoken) + bcrypt |
| **Email** | Nodemailer (SMTP) |
| **File Upload** | Multer (5MB limit, image-only) |
| **Charts** | Chart.js 4.x |
| **PDF Export** | jsPDF |
| **API Docs** | Swagger (swagger-jsdoc + swagger-ui-express) |
| **Security** | Helmet.js, CORS, express-rate-limit, CSRF tokens |
| **Scheduling** | node-cron |

---

## 4. Project Architecture

```
Alumni-Influencers/
├── src/
│   ├── app.js                  # Express application entry point
│   ├── config/
│   │   ├── swagger.js          # OpenAPI 3.0 specification
│   │   └── db.js               # Database config (if present)
│   ├── controllers/            # REST API route handlers (auto-mounted)
│   │   ├── auth/index.js       # Register, login, verify, reset
│   │   ├── profile/index.js    # Profile + sub-resource CRUD
│   │   ├── bidding/index.js    # Blind bidding system
│   │   ├── keys/index.js       # API key management (admin)
│   │   ├── featured/index.js   # Alumni of the Day (public)
│   │   ├── analytics/index.js  # Chart data aggregation
│   │   ├── sponsorships/index.js # Sponsor offers
│   │   └── wallet/index.js     # Balance & sponsorship backing
│   ├── middlewares/
│   │   ├── apiKeyAuth.js       # API key + JWT verification
│   │   ├── authMiddleware.js   # JWT Bearer/cookie auth
│   │   ├── checkRole.js        # Role-based access control
│   │   ├── checkPermission.js  # API key scope enforcement
│   │   ├── csrfProtection.js   # CSRF token validation
│   │   ├── rateLimiter.js      # 1500 req/hour per IP
│   │   ├── errorHandler.js     # Centralised error response
│   │   └── uploadMiddleware.js # Multer image upload config
│   ├── models/                 # Sequelize models (13 tables)
│   │   ├── index.js            # Association definitions
│   │   ├── User.js, Profile.js, Degree.js, Certification.js,
│   │   ├── Licence.js, ProfessionalCourse.js, Employment.js,
│   │   ├── Skill.js, Bid.js, ApiKey.js, ApiUsageLog.js,
│   │   └── Sponsor.js, SponsorshipOffer.js
│   ├── lib/boot.js             # Auto-mounts controllers at /api/{name}
│   ├── routes/pages.js         # Server-rendered EJS page routes
│   ├── utils/
│   │   ├── cronJobs.js         # Daily bid resolution + monthly reset
│   │   ├── mailer.js           # Nodemailer SMTP wrapper
│   │   ├── validators.js       # Email, password, URL validation
│   │   └── seedData.js         # 30 alumni + admin + sponsors seed
│   └── views/                  # EJS templates
│       ├── dashboard.ejs, alumni.ejs, profile.ejs, bidding.ejs,
│       ├── login.ejs, register.ejs, verify-email.ejs,
│       ├── forgot-password.ejs, reset-password.ejs,
│       ├── api-keys.ejs, wallet.ejs, sponsorships.ejs
│       └── partials/ (head.ejs, sidebar.ejs)
├── public/
│   ├── css/styles.css          # Full dark theme (1000+ lines)
│   └── js/                     # Client-side logic
│       ├── charts.js, alumni.js, profile.js, bidding.js,
│       ├── auth.js, apikeys.js, sponsorships.js, wallet.js
├── uploads/profiles/           # User-uploaded avatars
├── .env.example                # Environment variable template
├── package.json                # Dependencies
└── README.md                   # This file
```

### Request Flow

```
Client → Helmet/CORS → Rate Limiter → API Key/JWT Auth → CSRF Check → Controller → Sequelize → MySQL
                                                                           ↓
                                                                     EJS Template → Browser
```

### Authentication Flow
1. User registers with `.ac.uk` email → bcrypt hash (12 rounds) → verification token emailed
2. User submits token at `/verify-email` → account activated
3. Login returns JWT (24h expiry) as both JSON body and HttpOnly SameSite=Strict cookie
4. All protected routes check JWT from cookie or Authorization header

### Blind Bidding Flow
1. Alumni places bid for future date → system validates funds (wallet + sponsorship backing)
2. Other alumni place bids for same date → no one sees other bids (blind)
3. Cron runs daily at 18:00 → selects highest bidder as winner → emails win/lose notifications
4. Winner's profile becomes Alumni of the Day → accessible via `GET /api/featured/today`
5. Monthly limit: max 3 wins per calendar month (4 with event bonus), reset on 1st

### API Key Flow
1. Admin generates key via `POST /api/keys` → `crypto.randomBytes(32)` → 256-bit hex key
2. Key stored in DB with `permissions` (JSON array of scopes) and `client_name`
3. Every API request with `x-api-key` header is logged to `api_usage_logs`
4. Revoke: `DELETE /api/keys/:id` → soft-delete (`is_active=false`)
5. Renew: `PUT /api/keys/:id/renew` → generates new key value, preserves metadata

---

## 5. Security Implementation

| Measure | Implementation |
|---|---|
| Password Hashing | bcrypt with 12 salt rounds |
| Password Policy | Min 8 chars, upper, lower, digit, special character |
| JWT Tokens | HS256, configurable expiry, HttpOnly SameSite=Strict cookies |
| API Keys | 256-bit cryptographic keys, permission scoping, revocation |
| Helmet.js | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| CORS | Enabled via `cors()` middleware |
| CSRF | Double-submit token pattern on state-changing routes |
| Rate Limiting | 1500 requests/hour per IP via `express-rate-limit` |
| XSS Prevention | Strips `<script>`, `javascript:`, inline event handlers from all input |
| SQL Injection | Sequelize parameterized queries — no raw SQL with user input |
| Input Validation | University email regex, URL validation, field-level checks |
| File Upload | Image MIME type filter, 5MB size limit |

---

## 6. Database Design (3NF)

13 tables in MySQL, all in Third Normal Form. Key relationships:

- `users` → `profiles` (1:1)
- `profiles` → `degrees`, `certifications`, `licences`, `professional_courses`, `employment_history`, `skills` (1:N each)
- `users` → `bids` (1:N)
- `api_keys` → `api_usage_logs` (1:N)
- `users` → `sponsors` (1:1 for sponsor accounts)
- `sponsors` → `sponsorship_offers` (1:N)
- `users` → `sponsorship_offers` (1:N, as alumni recipient)

All child tables use `ON DELETE CASCADE`. Foreign keys enforce referential integrity. Composite indexes on frequently queried columns (graduation_date, industry_sector, status fields).

---

## 7. Installation & Setup

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/SavinPathirana/Alumni-Influencers.git
cd Alumni-Influencers

# 2. Install dependencies
npm install

# 3. Create the MySQL database
mysql -u root -p -e "CREATE DATABASE alumni_influencers;"

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your MySQL credentials, JWT secret, and SMTP config

# 5. Start the application (auto-creates tables via Sequelize sync)
npm run dev

# 6. Seed the database with 30 sample alumni (optional but recommended)
node src/utils/seedData.js

# 7. Verify the setup
# - Dashboard:  http://localhost:3000/dashboard
# - API Docs:   http://localhost:3000/api-docs
# - Health:     http://localhost:3000/api/health
```

### Default Test Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@westminster.ac.uk` | `Alumni@2024` |
| Sponsor | `sponsor.aws@westminster.ac.uk` | `Alumni@2024` |
| Sponsor | `sponsor.google@westminster.ac.uk` | `Alumni@2024` |
| Sponsor | `sponsor.cisco@westminster.ac.uk` | `Alumni@2024` |
| Alumni (×30) | `firstname.lastname@westminster.ac.uk` | `Alumni@2024` |

---

## 8. API Documentation

Interactive Swagger documentation is available at: **`http://localhost:3000/api-docs`**

Key API groups:
- `Authentication` — register, login, verify, logout, password reset
- `Profile` — base profile, degrees, certifications, licences, courses, employment, image
- `Bidding` — place, update, cancel, status, history, monthly-status
- `API Keys` — generate, list, revoke, renew, usage stats
- `Featured` — Alumni of the Day (public)
- `Analytics` — 10+ chart data endpoints with filter support
- `Sponsorships` — create, accept, reject offers
- `Wallet` — balance, sponsorship backing

---

## 9. Running Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Production start |
| `node src/utils/seedData.js` | Seed 30 alumni + admin + sponsors |

---

## 10. Viva Preparation Notes

### Why Monolithic Architecture?
The coursework specifies CW1 (API) and CW2 (dashboard) as part of the same system. A monolith avoids deployment complexity while keeping API and dashboard tightly integrated. The controller auto-mounting pattern (`lib/boot.js`) provides clean separation of concerns within the monolith.

### Why JWT over Sessions?
JWT provides stateless authentication suitable for both browser dashboard (via HttpOnly cookies) and API consumers (via Authorization header). The `SameSite=Strict` cookie flag provides CSRF mitigation, supplemented by explicit CSRF tokens for state-changing operations.

### Why Sequelize over Raw SQL?
Sequelize provides parameterized queries (SQL injection prevention), model validations, association management, and automatic migration via `sync({ alter: true })`. All queries use the ORM — no raw SQL with user input.

### Blind Bidding Design
Users can only see their own bid and whether they are currently winning (boolean), never the actual highest bid amount. The winner is selected by cron at 18:00 daily to ensure fairness.
