const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

const authRoutes = require('./routes/auth');
const busRoutes = require('./routes/buses');
const routeRoutes = require('./routes/routes');
const scheduleRoutes = require('./routes/schedules');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const ticketRoutes = require('./routes/tickets');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const seatRoutes = require('./routes/seats');
const driverRoutes = require('./routes/drivers');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Bootstrap admin account on startup
async function bootstrapAdmin() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cag_bus_booking',
    });
    const hash = await bcrypt.hash('1234', 12);
    const [existing] = await conn.query('SELECT id FROM admins WHERE username = ? OR email = ?', ['admin', 'ruvmudzingwa@gmail.com']);
    if (existing.length === 0) {
      await conn.query('INSERT INTO admins (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)', ['admin', 'ruvmudzingwa@gmail.com', hash, 'Super Admin', 'super_admin']);
      console.log('Admin account created: ruvmudzingwa@gmail.com / 1234');
    } else {
      await conn.query('UPDATE admins SET email = ?, password_hash = ?, full_name = ? WHERE id = ?', ['ruvmudzingwa@gmail.com', hash, 'Super Admin', existing[0].id]);
      console.log('Admin account updated: ruvmudzingwa@gmail.com / 1234');
    }
    await conn.end();
  } catch (err) {
    console.error('Admin bootstrap error:', err.message);
  }
}

// Also allow manual trigger via URL
app.all('/api/admin/bootstrap', async (req, res) => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cag_bus_booking',
    });
    const hash = await bcrypt.hash('1234', 12);
    const [existing] = await conn.query('SELECT id FROM admins WHERE username = ? OR email = ?', ['admin', 'ruvmudzingwa@gmail.com']);
    if (existing.length === 0) {
      await conn.query('INSERT INTO admins (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)', ['admin', 'ruvmudzingwa@gmail.com', hash, 'Super Admin', 'super_admin']);
      res.json({ message: 'Admin created', email: 'ruvmudzingwa@gmail.com', password: '1234' });
    } else {
      await conn.query('UPDATE admins SET email = ?, password_hash = ?, full_name = ? WHERE id = ?', ['ruvmudzingwa@gmail.com', hash, 'Super Admin', existing[0].id]);
      res.json({ message: 'Admin updated', email: 'ruvmudzingwa@gmail.com', password: '1234' });
    }
    await conn.end();
  } catch (err) {
    console.error('Bootstrap error:', err.message);
    res.status(500).json({ error: 'Bootstrap failed: ' + err.message });
  }
});

// Serve SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

bootstrapAdmin();
app.listen(PORT, () => {
  console.log(`CAG Bus Booking Server running on http://localhost:${PORT}`);
});
