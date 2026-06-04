# 🚌 CAG Bus Booking & Payment System

A full-stack bus booking and payment management system built for **Zimbabwean intercity travel**. Allows customers to search routes, select seats, book tickets, and make payments online, while administrators manage the entire fleet, schedule, and operations.

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Features Overview](#-features-overview)
- [Database Explained](#-database-explained)
- [API Endpoints](#-api-endpoints)
- [How to Access the App](#-how-to-access-the-app)
- [How to Create Accounts](#-how-to-create-accounts)
- [How the Site Operates](#-how-the-site-operates)
- [Running Locally](#-running-locally)
- [Deployment](#-deployment)
- [Sample SQL Queries](#-sample-sql-queries)
- [Admin Guide](#-admin-guide)
- [Customer Guide](#-customer-guide)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **HTML5** | Structure of all 17 pages |
| **CSS3** | Responsive styling, animations, grid layout |
| **Vanilla JavaScript (ES6+)** | All frontend logic, API calls, DOM manipulation |
| **Local Storage** | JWT token + user session persistence |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** (v24.15.0) | JavaScript runtime |
| **Express.js** (v4.18) | HTTP server + routing framework |
| **node:sqlite** (built-in) | SQLite3 database engine — no external DB needed |
| **bcryptjs** | Password hashing (12 salt rounds) |
| **jsonwebtoken** | JWT authentication tokens |
| **qrcode** | Generate QR codes for e-tickets |
| **uuid** | Generate unique transaction IDs |
| **helmet** | HTTP security headers |
| **express-rate-limit** | API rate limiting (200 req/15 min) |
| **cors** | Cross-Origin Resource Sharing |

### Database
| Feature | Detail |
|---|---|
| **Engine** | SQLite3 via Node.js built-in `node:sqlite` module |
| **File location** | `backend/data/cag_bus.db` |
| **Mode** | WAL (Write-Ahead Logging) for performance |
| **Foreign keys** | Enabled on connection |
| **No installation** | SQLite is embedded — zero external dependencies |

---

## 📁 Project Structure

```
bus booking/
├── frontend/                   # Static frontend files
│   ├── index.html              # Home page with bus search
│   ├── css/
│   │   └── style.css           # Complete stylesheet
│   ├── js/
│   │   └── api.js              # API client + utility functions
│   ├── customer/               # Customer-facing pages (8 pages)
│   │   ├── login.html          # Customer login
│   │   ├── register.html       # Customer registration
│   │   ├── search-results.html # Bus schedule search results
│   │   ├── bus-detail.html     # Interactive seat selection map
│   │   ├── checkout.html       # Passenger details + payment
│   │   ├── confirmation.html   # E-ticket with QR codes
│   │   ├── my-bookings.html    # Booking history
│   │   └── profile.html        # User profile management
│   └── admin/                  # Admin dashboard pages (8 pages)
│       ├── login.html          # Admin login
│       ├── dashboard.html      # Real-time statistics dashboard
│       ├── buses.html          # Bus fleet CRUD
│       ├── routes.html         # Routes & schedules management
│       ├── bookings.html       # Booking management
│       ├── payments.html       # Payment reports
│       ├── customers.html      # Customer management
│       └── settings.html       # System settings
│
├── backend/                    # Express.js backend
│   ├── server.js               # Entry point — mounts routes, middleware
│   ├── config/
│   │   └── db.js               # SQLite init, schema, seeding, query wrapper
│   ├── routes/                 # 12 route files (48 API endpoints)
│   │   ├── admin.js            # Admin login, dashboard, settings
│   │   ├── auth.js             # Customer register, login, profile
│   │   ├── buses.js            # Bus CRUD
│   │   ├── routes.js           # Route CRUD
│   │   ├── schedules.js        # Schedule CRUD + availability
│   │   ├── seats.js            # Seat layout + availability check
│   │   ├── bookings.js         # Booking create, cancel, admin manage
│   │   ├── payments.js         # Payment process + reports
│   │   ├── tickets.js          # E-ticket retrieval
│   │   ├── reviews.js          # Customer reviews + admin approval
│   │   ├── users.js            # Customer management (admin)
│   │   └── drivers.js          # Driver listing
│   ├── middleware/
│   │   ├── auth.js             # Customer JWT verification
│   │   └── adminAuth.js        # Admin JWT verification
│   ├── utils/
│   │   ├── helpers.js          # Booking ref, ticket number, transaction ID
│   │   └── qrCode.js           # QR code generation
│   ├── data/                   # SQLite database stored here (gitignored)
│   │   └── cag_bus.db          # Auto-created on first run
│   └── package.json
│
├── .env.example                # Example environment variables
├── .gitignore                  # Git ignore rules
├── render.yaml                 # Render deployment blueprint
├── start.bat                   # Windows start script
├── README.md                   # This file
└── database/
    └── schema.sql              # Original MySQL schema (reference only)
```

---

## ✨ Features Overview

### Customer Features
- 🔍 **Search buses** by origin, destination, and date
- 🗺️ **Interactive seat map** — view layout, pick specific seats (window/aisle/middle)
- 💺 **Real-time seat availability** — seats lock during booking
- 📋 **Multiple passenger booking** — add multiple travelers in one booking
- 💳 **Multiple payment methods** — EcoCash, OneMoney, ZimSwitch, Cash on Departure
- 🎫 **E-tickets with QR codes** — instant digital ticket generation
- 📱 **My Bookings** — view history, cancel bookings
- 👤 **Profile management** — update name, phone, password
- ⭐ **Leave reviews & ratings** for buses you've traveled on

### Admin Features
- 📊 **Dashboard** — real-time stats: today's bookings, revenue, active buses, routes, users
- 🚌 **Bus management** — add/edit/deactivate buses (number, plate, type, capacity)
- 🗺️ **Route management** — add/edit/deactivate routes (origin, destination, distance, duration)
- 📅 **Schedule management** — assign buses + drivers to routes with departure/arrival times
- 📋 **Booking management** — view all bookings, update status (confirm/cancel/complete/refund)
- 💰 **Payment reports** — filter by date range, status; view totals
- 👥 **Customer management** — view and search registered customers
- ✅ **Review moderation** — approve or reject customer reviews
- ⚙️ **System settings** — view app configuration

### System Features
- 🔐 **JWT-based authentication** — separate tokens for admin and customers
- 🛡️ **Rate limiting** — 200 requests per 15-minute window per IP
- 🛡️ **Helmet security headers** — protection against common web vulnerabilities
- 🔄 **Auto-bootstrap** — admin account + sample data created on first startup
- 📦 **Zero external dependencies** — SQLite built into Node.js, no MySQL needed
- 🚀 **Render-ready** — deployable with one click via render.yaml

---

## 🗄️ Database Explained

### Overview

The system uses **SQLite3** via Node.js built-in `node:sqlite` module. The database is a single file at `backend/data/cag_bus.db`. No separate database server is needed — the database lives with your application.

### Why SQLite?
- ✅ **Zero configuration** — no database server to install or manage
- ✅ **Built into Node.js** — no npm package needed (since Node 22.5+)
- ✅ **Portable** — the entire database is one file
- ✅ **Perfect for this scale** — handles thousands of bookings with ease
- ✅ **WAL mode** — concurrent reads don't block writes

### Database Tables (12 tables)

| Table | Purpose | Key Columns |
|---|---|---|
| **admins** | System administrators | username, email, password_hash, role, is_active |
| **users** | Registered customers | full_name, email, phone, password_hash, is_active |
| **buses** | Bus fleet inventory | bus_number, plate_number, bus_type, capacity, seat_layout |
| **drivers** | Driver records | full_name, license_number, phone, assigned_bus_id |
| **routes** | Travel routes | origin, destination, distance_km, duration_minutes |
| **schedules** | Bus departure schedules | route_id, bus_id, driver_id, departure_time, arrival_time, base_price, operating_days |
| **seats** | Per-schedule per-date seats | schedule_id, travel_date, seat_number, seat_row, seat_column, is_booked, price |
| **bookings** | Booking records | booking_reference, user_id, schedule_id, travel_date, total_amount, final_amount, status |
| **booking_passengers** | Individual passengers per booking | booking_id, seat_id, full_name, age, gender |
| **payments** | Payment transactions | booking_id, transaction_id, amount, payment_method, payment_status |
| **tickets** | E-ticket records | booking_id, ticket_number, seat_number, qr_code |
| **reviews** | Customer feedback | user_id, bus_id, rating, comment, is_approved |

### Entity Relationship

```
admins ─── (independent, not linked to customers)

users ──< bookings ──< booking_passengers >── seats
         │                                  │
         └──< payments                      │
         └──< tickets                       │
                                            │
buses ──< schedules ──< seats              │
       │              │                    │
       └──< reviews   └──< drivers          │
                      │                    │
routes ──< schedules ───────────────────────┘
```

### How the Database Connects

In `backend/config/db.js`:
1. The file uses Node's built-in `DatabaseSync` from `node:sqlite`
2. Opens/creates `backend/data/cag_bus.db`
3. Enables WAL mode and foreign keys
4. Runs `initSchema()` — creates all 12 tables if they don't exist
5. Runs `seedAdmin()` — creates/updates the admin account
6. Runs `seedData()` — fills in sample buses, routes, drivers, and users
7. Exports a `pool` object with `pool.query(sql, params)` and `pool.getConnection()`

### Auto-Seeding

On **first run**, the system automatically seeds:
- **1 admin**: `admin` / `1234` (email: `ruvmudzingwa@gmail.com`)
- **6 buses** of various types (standard, luxury, AC, sleeper)
- **24 route pairs** connecting major Zimbabwean cities
- **10 drivers** with license numbers and contact info
- **5 sample users** (all with password `password123`)

---

## 🌐 API Endpoints

**Base URL**: `http://localhost:5000/api` (local) or `https://your-app.onrender.com/api`

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Customer login → JWT token |
| POST | `/api/auth/register` | Public | Create new customer account |
| GET | `/api/auth/me` | Customer | Get current user profile |
| PUT | `/api/auth/profile` | Customer | Update name, phone, address |
| PUT | `/api/auth/change-password` | Customer | Change password |
| POST | `/api/admin/login` | Public | Admin login → JWT token |

### Browsing (Public)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/buses` | List all active buses |
| GET | `/api/buses/:id` | Get bus details |
| GET | `/api/routes` | List all active routes |
| GET | `/api/routes/search?origin=X&destination=Y` | Search routes |
| GET | `/api/routes/origins` | Get all origin cities |
| GET | `/api/routes/destinations?origin=X` | Get destinations for an origin |
| GET | `/api/routes/:id` | Get route details |
| GET | `/api/schedules?origin=X&destination=Y&date=Z` | List schedules |
| GET | `/api/schedules/available?origin=X&destination=Y&date=Z` | Available schedules with seat counts |
| GET | `/api/schedules/:id` | Get schedule with bus, route, driver |
| GET | `/api/seats/:scheduleId/:date` | Get seat layout for a schedule+date |
| POST | `/api/seats/check-availability` | Check if selected seats are available |
| GET | `/api/drivers` | List active drivers |

### Customer Actions (JWT Required)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/bookings/create` | Create a booking (select seats, add passengers) |
| GET | `/api/bookings/my-bookings` | Get my booking history |
| GET | `/api/bookings/:reference` | Get booking details by reference |
| PUT | `/api/bookings/:id/cancel` | Cancel my booking |
| POST | `/api/payments/process` | Process payment |
| GET | `/api/tickets/:bookingReference` | Get e-tickets with QR codes |
| POST | `/api/reviews` | Submit a bus review |
| POST | `/api/bookings/admin/all` | (Admin) View all bookings |

### Admin Actions (Admin JWT Required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/me` | Get admin profile |
| GET | `/api/admin/dashboard` | Dashboard statistics |
| GET | `/api/admin/settings` | System settings |
| POST / PUT / DELETE | `/api/buses/:id?` | Bus CRUD |
| POST / PUT / DELETE | `/api/routes/:id?` | Route CRUD |
| POST / PUT / DELETE | `/api/schedules/:id?` | Schedule CRUD |
| PUT | `/api/bookings/admin/:id/status` | Update booking status |
| GET | `/api/payments/reports` | Payment reports |
| GET | `/api/users` | List customers |
| GET | `/api/users/stats` | User statistics |
| GET | `/api/users/:id` | Customer details |
| GET | `/api/reviews/admin/all` | All reviews |
| PUT | `/api/reviews/admin/:id/approve` | Approve/reject review |

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check → `{"status":"ok"}` |

---

## 🌍 How to Access the App

### Live on Render
```
https://cag-bus-booking.onrender.com
```

### Locally
```
http://localhost:5000
```

### Default Port
The server runs on **port 5000** by default. Set the `PORT` environment variable to change it.

---

## 👤 How to Create Accounts

### Pre-Seeded Accounts

On first startup, the system automatically creates these accounts:

#### Admin Account
| Field | Value |
|---|---|
| **Username** | `admin` |
| **Email** | `ruvmudzingwa@gmail.com` |
| **Password** | `1234` |
| **Role** | `super_admin` |
| **Full Name** | Super Admin |

#### Customer Accounts
| Email | Password | Full Name |
|---|---|---|
| `tatenda@example.co.zw` | `password123` | Tatenda Moyo |
| `nomsa@example.co.zw` | `password123` | Nomsa Ncube |
| `takunda@example.co.zw` | `password123` | Takunda Chikwanha |
| `rumbi@example.co.zw` | `password123` | Rumbidzai Sithole |
| `kuda@example.co.zw` | `password123` | Kudakwashe Mhere |

### Creating a New Admin

Edit `backend/config/db.js` — the `seedAdmin()` function creates the admin on startup. You can modify the email/password there, or in an existing database, run a manual insert:

```sql
INSERT INTO admins (username, email, password_hash, full_name, role)
VALUES ('newadmin', 'admin@example.com', '<bcrypt_hash_of_password>', 'New Admin', 'admin');
```

### Creating a New Customer

1. Go to the homepage → click **"Sign Up Free"**
2. Fill in: Full Name, Email, Phone, Password
3. Submit — you'll be logged in automatically

Or via API:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"John Doe","email":"john@example.com","phone":"+263771234567","password":"securepass123"}'
```

---

## 🎯 How the Site Operates

### Customer Flow

```
1. HOME PAGE
   ├── Enter origin city
   ├── Enter destination city
   └── Select travel date
        │
        ▼
2. SEARCH RESULTS
   ├── View available buses + departure times + prices
   └── Click "Select Seats" on a schedule
        │
        ▼
3. SEAT SELECTION
   ├── Interactive seat map (green = available, red = booked)
   ├── Select seats (window, aisle, or middle)
   └── Click "Continue to Booking"
        │
        ▼
4. CHECKOUT
   ├── Fill passenger details per seat (name, age, gender, ID)
   ├── Enter contact phone + email
   ├── Add special requests (optional)
   └── Select payment method (EcoCash, OneMoney, ZimSwitch, Cash on Departure)
        │
        ▼
5. PAYMENT
   ├── Simulated payment processing
   └── On success:
        │
        ▼
6. CONFIRMATION
   ├── Booking reference number (e.g., CAG-A3B7K2)
   ├── E-tickets with QR codes for each passenger
   └── Print or download tickets
```

### Admin Flow

```
1. ADMIN LOGIN (ruvmudzingwa@gmail.com / 1234)
   │
   ▼
2. DASHBOARD
   ├── Today's bookings count + revenue
   ├── Active buses, routes, users
   ├── Bookings by status (pie chart)
   └── Monthly revenue trend (last 6 months)
   │
   ▼
3. MANAGE BUSES
   ├── View all buses in the fleet
   ├── Add new bus (number, plate, type, capacity, amenities)
   ├── Edit existing bus details
   └── Deactivate a bus (soft delete)
   │
   ▼
4. MANAGE ROUTES & SCHEDULES
   ├── Add/edit routes (origin, destination, distance, duration)
   ├── Create schedules (assign bus + driver to route, set times + price)
   └── Deactivate routes/schedules
   │
   ▼
5. MANAGE BOOKINGS
   ├── View all bookings with filters (status, date range)
   ├── Update booking status (pending → confirmed → completed)
   └── Process cancellations/refunds
   │
   ▼
6. PAYMENT REPORTS
   ├── Filter by date range and payment status
   ├── View payment totals
   └── Export to CSV
   │
   ▼
7. CUSTOMERS
   ├── View all registered customers
   ├── Search by name or email
   └── View customer details (total spent, booking count)
   │
   ▼
8. REVIEWS
   ├── View all customer reviews
   └── Approve or reject reviews
```

---

## 🚀 Running Locally

### Prerequisites
- **Node.js** v20+ (tested on v24.15.0)

### Steps

```bash
# 1. Navigate to the backend directory
cd bus booking/backend

# 2. Install dependencies
npm install

# 3. Create .env file (copy from .env.example if it exists)
# Minimum required:
@"
JWT_SECRET=your-random-secret-here
ADMIN_JWT_SECRET=your-admin-secret-here
JWT_EXPIRES_IN=7d
ADMIN_JWT_EXPIRES_IN=1d
"@ | Out-File -FilePath .env -Encoding utf8

# 4. Start the server
npm start
# Or with auto-reload:
npm run dev

# 5. Open browser
# http://localhost:5000
```

### Windows Quick Start
Double-click `start.bat` or run:
```bash
cd backend && node server.js
```

---

## ☁️ Deployment

### On Render

1. Push this repo to GitHub
2. In Render dashboard → **New +** → **Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` and auto-configures:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. Set environment variables in Render dashboard:
   - `JWT_SECRET`, `ADMIN_JWT_SECRET` (set to random strings)
   - `JWT_EXPIRES_IN`, `ADMIN_JWT_EXPIRES_IN`
6. Deploy — the app will be live in 2-3 minutes

> **Note**: On Render free tier, the server spins down after 15 minutes of inactivity. The first request after idle takes ~30 seconds to wake up.

---

## 📊 Sample SQL Queries

Since the database is SQLite, you can query it directly using the `sqlite3` CLI or any SQLite browser.

### Connect to the database

```bash
# Install sqlite3 CLI if needed (Windows: download from sqlite.org)
sqlite3 backend/data/cag_bus.db

# Or use Node.js REPL
node -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('backend/data/cag_bus.db');
const rows = db.prepare('SELECT * FROM admins').all();
console.log(JSON.stringify(rows, null, 2));
"
```

### Sample Queries

#### View all administrators
```sql
SELECT id, username, email, full_name, role, last_login
FROM admins;
```

#### View all buses with their types
```sql
SELECT id, bus_number, plate_number, bus_type, capacity, is_active
FROM buses
ORDER BY bus_type;
```

#### Find routes from Harare
```sql
SELECT id, origin, destination, distance_km, duration_minutes
FROM routes
WHERE origin = 'Harare' AND is_active = 1
ORDER BY destination;
```

#### Search available schedules
```sql
SELECT s.id, r.origin, r.destination, s.departure_time, s.arrival_time, s.base_price,
       b.bus_number, b.bus_type, b.capacity
FROM schedules s
JOIN routes r ON s.route_id = r.id
JOIN buses b ON s.bus_id = b.id
WHERE r.origin = 'Harare'
  AND r.destination = 'Bulawayo'
  AND s.is_active = 1
  AND r.is_active = 1;
```

#### Check seat availability for a schedule on a date
```sql
SELECT seat_number, seat_row, seat_column, seat_type, is_booked, price
FROM seats
WHERE schedule_id = 1
  AND travel_date = '2026-06-10'
ORDER BY seat_row, seat_column;
```

#### View today's bookings summary
```sql
SELECT COUNT(*) AS total_bookings,
       COALESCE(SUM(final_amount), 0) AS total_revenue
FROM bookings
WHERE date(booking_date) = date('now');
```

#### View all bookings with customer info
```sql
SELECT b.booking_reference, u.full_name, u.email, b.travel_date,
       b.total_amount, b.status, b.booking_date
FROM bookings b
JOIN users u ON b.user_id = u.id
ORDER BY b.booking_date DESC
LIMIT 10;
```

#### List passengers for a specific booking
```sql
SELECT bp.full_name, bp.age, bp.gender, s.seat_number
FROM booking_passengers bp
JOIN seats s ON bp.seat_id = s.id
WHERE bp.booking_id = 1;
```

#### View payment transactions
```sql
SELECT p.transaction_id, b.booking_reference, p.amount,
       p.payment_method, p.payment_status, p.payment_date
FROM payments p
JOIN bookings b ON p.booking_id = b.id
ORDER BY p.payment_date DESC;
```

#### Revenue by month (last 6 months)
```sql
SELECT strftime('%Y-%m', payment_date) AS month,
       SUM(amount) AS revenue,
       COUNT(*) AS transactions
FROM payments
WHERE payment_status = 'success'
  AND payment_date >= datetime('now', '-6 months')
GROUP BY month
ORDER BY month;
```

#### Most popular routes
```sql
SELECT r.origin, r.destination, COUNT(b.id) AS total_bookings
FROM routes r
JOIN schedules s ON r.id = s.route_id
JOIN bookings b ON s.id = b.schedule_id
GROUP BY r.id
ORDER BY total_bookings DESC
LIMIT 5;
```

#### Customer with most bookings
```sql
SELECT u.full_name, u.email,
       COUNT(b.id) AS booking_count,
       COALESCE(SUM(b.final_amount), 0) AS total_spent
FROM users u
LEFT JOIN bookings b ON u.id = b.user_id
GROUP BY u.id
ORDER BY total_spent DESC;
```

#### Bus utilization
```sql
SELECT b.bus_number, b.bus_type, b.capacity,
       COUNT(s.id) AS schedules_count
FROM buses b
LEFT JOIN schedules s ON b.id = s.bus_id AND s.is_active = 1
GROUP BY b.id
ORDER BY schedules_count DESC;
```

#### View all approved reviews with bus info
```sql
SELECT r.rating, r.comment, u.full_name AS customer,
       b.bus_number, r.created_at
FROM reviews r
JOIN users u ON r.user_id = u.id
JOIN buses b ON r.bus_id = b.id
WHERE r.is_approved = 1
ORDER BY r.created_at DESC;
```

#### Find available seats for a schedule
```sql
SELECT s.seat_number, s.seat_type, s.price
FROM seats s
WHERE s.schedule_id = 1
  AND s.travel_date = '2026-06-10'
  AND s.is_booked = 0
ORDER BY s.seat_row, s.seat_column;
```

#### Check if a specific booking exists by reference
```sql
SELECT b.*, u.full_name, u.email, u.phone
FROM bookings b
JOIN users u ON b.user_id = u.id
WHERE b.booking_reference = 'CAG-A3B7K2';
```

#### Count bookings by status
```sql
SELECT status, COUNT(*) AS count
FROM bookings
GROUP BY status
ORDER BY count DESC;
```

#### Get average rating for each bus
```sql
SELECT b.bus_number, b.bus_type,
       ROUND(AVG(r.rating), 1) AS avg_rating,
       COUNT(r.id) AS review_count
FROM buses b
LEFT JOIN reviews r ON b.id = r.bus_id AND r.is_approved = 1
GROUP BY b.id
ORDER BY avg_rating DESC;
```

---

## 🧑‍💼 Admin Guide

### Accessing Admin Panel
1. Navigate to `https://cag-bus-booking.onrender.com` (or your local URL)
2. Click **"Admin"** in the footer, or go directly to `/admin/dashboard.html`
3. Login with: `ruvmudzingwa@gmail.com` / `1234`

### Dashboard Overview
The dashboard shows:
- **Today's Bookings** — total bookings and revenue for today
- **Active Buses** — count of operational buses
- **Active Routes** — count of active routes
- **Total Users** — registered customer count
- **Total Revenue** — all-time successful payments
- **Pending Bookings** — bookings awaiting confirmation
- **Bookings by Status** — breakdown chart
- **Monthly Revenue** — last 6 months trend

### Managing Buses
- **Add**: Click "Add Bus" → fill number, plate, type, capacity → Save
- **Edit**: Click "Edit" on any bus → modify fields → Save
- **Deactivate**: Click "Deactivate" to soft-delete (hides from search)

### Managing Routes
- **Add**: Click "Add Route" → enter origin, destination, distance, duration → Save
- **Edit**: Modify existing route details
- **Deactivate**: Soft-delete a route

### Managing Schedules
- **Add**: Select route, bus, driver → set departure/arrival times → set price → Save
- **Operating Days**: Text field (e.g., `mon,tue,wed,thu,fri,sat,sun`)

### Managing Bookings
- **Filter**: By status (pending, confirmed, cancelled, completed, refunded) or date range
- **Update Status**: Click action buttons to change booking status
  - **Confirm** — mark as confirmed
  - **Complete** — mark journey as completed
  - **Cancel** — cancel booking (frees seats)
  - **Refund** — mark as refunded (for paid bookings)

### Payment Reports
- **Filter**: By date range and payment status
- **View**: Transaction ID, booking reference, amount, method, status, date
- **Export**: Click "Export to CSV" to download

---

## 👤 Customer Guide

### Booking a Ticket
1. Go to the **home page**
2. Enter your **origin city** (e.g., Harare) — autocomplete helps
3. Enter your **destination city** (e.g., Bulawayo)
4. Select **travel date**
5. Click **"Search Buses"**
6. Browse available schedules → click **"Select Seats"**
7. Choose your seat(s) from the interactive map
8. Click **"Continue to Booking"** (login required)
9. Fill in **passenger details** for each seat
10. Select a **payment method**
11. Click **"Confirm Booking"**
12. View your **e-ticket with QR code**

### Managing Your Profile
1. Click your name in the navigation bar
2. Edit: Name, Phone, Address
3. Change password

### Viewing My Bookings
1. Click **"My Bookings"** in navigation
2. See all your bookings with status
3. Click a booking reference for details
4. Cancel a booking if needed (before departure)

### Leaving a Review
1. Go to your **completed booking** details
2. Leave a rating (1-5 stars) and comment
3. Reviews require admin approval before appearing

---

## 🔒 Security

- **Passwords** hashed with bcrypt (12 salt rounds)
- **JWT tokens** with configurable expiration
- **Separate secrets** for customer and admin tokens
- **Rate limiting** — 200 requests per 15 minutes per IP
- **Helmet.js** — HTTP security headers (CSP, X-Frame-Options, etc.)
- **CORS** — configurable origin whitelist
- **Input validation** — express-validator on some routes
- **SQL injection protection** — all queries use parameterized statements (`?` placeholders)
- **No sensitive data in git** — `.env`, `node_modules/`, `data/` all gitignored

---

## 🛠 Troubleshooting

### "Admin bootstrap error: getaddrinfo ENOTFOUND"
**Cause**: Old MySQL bootstrap code is still running.
**Fix**: Make sure you've saved the updated `server.js` and `config/db.js` files, then restart the server. If on Render, push to GitHub to trigger redeploy.

### "Cannot find module 'node:sqlite'"
**Cause**: Node.js version too old (below v22.5).
**Fix**: Upgrade to Node.js v20+ or use `nvm` to switch: `nvm use 24`.

### "SQLITE_CONSTRAINT_UNIQUE" error
**Cause**: Duplicate entry (e.g., bus number already exists).
**Fix**: Use a unique bus number or plate number.

### Server won't start
**Cause**: Port already in use or missing dependencies.
**Fix**:
```bash
# Check what's using the port
netstat -ano | findstr :5000

# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
```

### "Cannot find module 'bcryptjs'"
**Fix**: Run `npm install` in the `backend/` directory.

### Database file is huge
**Fix**: The WAL log can grow. Periodically run:
```sql
PRAGMA wal_checkpoint(TRUNCATE);
```

---

## 📝 License

This project is developed for CAG Bus Zimbabwe. All rights reserved.

---

## 🙋 Support

For issues or questions:
- GitHub: https://github.com/Tascar600/cag-bus-booking
- Live App: https://cag-bus-booking.onrender.com
