# CAG Bus Booking & Payment System

A complete bus booking and payment management website for CAG Bus Company, featuring both Customer and Admin interfaces.

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (responsive, no framework)
- **Backend:** Node.js with Express.js
- **Database:** MySQL
- **Authentication:** JWT (JSON Web Tokens)
- **Payment:** Simulated payment gateway
- **QR Code:** qrcode npm package (e-tickets)

## Project Structure

```
bus-booking/
├── database/
│   └── schema.sql              # Full MySQL schema (10+ tables)
├── backend/
│   ├── server.js                # Express server entry point
│   ├── package.json             # Dependencies
│   ├── .env                     # Environment variables
│   ├── seed.js                  # Database seeder (sample data)
│   ├── config/
│   │   └── db.js                # MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js              # Customer JWT auth middleware
│   │   └── adminAuth.js         # Admin JWT auth middleware
│   ├── routes/                  # API route handlers
│   │   ├── auth.js              # Customer registration/login
│   │   ├── admin.js             # Admin login, dashboard, settings
│   │   ├── buses.js             # Bus CRUD
│   │   ├── routes.js            # Route management
│   │   ├── schedules.js         # Schedule management
│   │   ├── seats.js             # Seat layout & availability
│   │   ├── bookings.js          # Booking creation & management
│   │   ├── payments.js          # Payment processing & reports
│   │   ├── tickets.js           # E-ticket retrieval
│   │   ├── reviews.js           # Customer reviews
│   │   └── users.js             # Customer management (admin)
│   └── utils/
│       ├── helpers.js           # Booking refs, validation
│       └── qrCode.js            # QR code generation
├── frontend/
│   ├── index.html               # Home page with search
│   ├── css/
│   │   └── style.css            # Complete responsive stylesheet
│   ├── js/
│   │   └── api.js               # API client + utility functions
│   ├── customer/                # Customer-facing pages
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── search-results.html
│   │   ├── bus-detail.html      # Seat selection map
│   │   ├── checkout.html        # Passenger form + payment
│   │   ├── confirmation.html    # E-ticket with QR codes
│   │   ├── my-bookings.html     # Booking history
│   │   └── profile.html         # User profile management
│   └── admin/                   # Admin dashboard pages
│       ├── login.html
│       ├── dashboard.html       # Stats overview
│       ├── buses.html           # Bus management
│       ├── routes.html          # Routes & schedules
│       ├── bookings.html        # Booking management
│       ├── payments.html        # Payment reports + CSV export
│       ├── customers.html       # Customer management
│       └── settings.html        # System settings
└── README.md
```

## Database Tables

1. **users** - Customer accounts
2. **admins** - Admin panel users
3. **buses** - Bus fleet with capacity, type, amenities
4. **drivers** - Driver information
5. **routes** - Origin-destination pairs
6. **schedules** - Departure/arrival times & prices
7. **seats** - Per-schedule, per-date seat tracking
8. **bookings** - Booking records with reference numbers
9. **booking_passengers** - Individual passenger details
10. **payments** - Payment transactions
11. **tickets** - E-tickets with QR codes
12. **reviews** - Customer feedback & ratings

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm

### Step 1: Database Setup

1. Open MySQL command line or MySQL Workbench
2. Run the schema file:
   ```sql
   SOURCE C:\path\to\bus-booking\database\schema.sql;
   ```
   Or copy-paste the contents of `database/schema.sql` and execute.

### Step 2: Configure Backend

1. Navigate to the backend folder:
   ```bash
   cd bus-booking/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Edit `.env` file with your MySQL credentials:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=cag_bus_booking
   ```

### Step 3: Seed Database (Sample Data)

```bash
cd bus-booking/backend
npm run seed
```

This populates the database with:
- 2 admin accounts
- 5 sample buses
- 10 routes
- 12 schedules
- Sample data for testing

### Step 4: Start Server

```bash
cd bus-booking/backend
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server starts on `http://localhost:5000`

### Step 5: Access the Application

Open your browser and navigate to:

- **Customer Home:** `http://localhost:5000`
- **Customer Login:** `http://localhost:5000/customer/login.html`
- **Customer Register:** `http://localhost:5000/customer/register.html`
- **Admin Login:** `http://localhost:5000/admin/login.html`

## Default Login Credentials

### Admin Panel
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Super Admin |
| manager | admin123 | Manager |

### Customer (register new or use a seeded account)
Register a new account at `/customer/register.html`

## API Endpoints

### Public
- `GET /api/buses` - List buses
- `GET /api/routes` - List routes
- `GET /api/routes/origins` - Get origin cities
- `GET /api/routes/destinations` - Get destinations
- `GET /api/schedules/available` - Search schedules
- `GET /api/seats/:scheduleId/:date` - Seat layout

### Customer Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get profile
- `PUT /api/auth/profile` - Update profile

### Bookings
- `POST /api/bookings/create` - Create booking
- `GET /api/bookings/my-bookings` - User's bookings
- `GET /api/bookings/:reference` - Booking details
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Payments
- `POST /api/payments/process` - Process payment (simulated)

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/dashboard` - Dashboard stats
- `CRUD /api/admin/buses` - Bus management
- `CRUD /api/admin/routes` - Route management
- `CRUD /api/admin/schedules` - Schedule management
- `GET /api/bookings/admin/all` - All bookings
- `PUT /api/bookings/admin/:id/status` - Update booking status
- `GET /api/payments/reports` - Payment reports
- `GET /api/users` - List customers

## Features

### Customer Side
- Search buses by origin, destination, and date
- Filter results by bus type, price, departure time
- Interactive seat selection map (click to select)
- Passenger details form with validation
- Simulated payment processing (80% success rate)
- E-ticket generation with QR codes
- Print-friendly ticket view
- My Bookings with cancel functionality
- User registration, login, profile management

### Admin Side
- Dashboard with real-time stats (bookings, revenue, buses)
- Bus fleet management (add/edit/delete)
- Route and schedule management
- Booking management (approve/cancel/complete/refund)
- Payment reports with filters and CSV export
- Customer management with search and details
- Role-based access control (super_admin, admin, manager)

## Security

- JWT-based authentication for both customers and admins
- Separate JWT secrets for customer and admin
- Password hashing with bcryptjs (12 rounds)
- Input validation on all endpoints
- Rate limiting on API routes
- Helmet security headers
- Role-based access control for admin routes
- Prepared SQL statements (prevents injection)
- CORS configuration

## Payment Simulation

The payment gateway is simulated with:
- 80% approval rate
- Random success/failure for testing
- Realistic transaction flow
- Refund processing on cancellation
- Transaction IDs are generated

## License

Internal use - CAG Bus Company
