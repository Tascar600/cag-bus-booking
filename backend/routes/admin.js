const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateAdmin, requireRole } = require('../middleware/adminAuth');

const router = express.Router();

// POST /api/admin/login - Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [admins] = await pool.query(
      'SELECT * FROM admins WHERE (username = ? OR email = ?) AND is_active = TRUE',
      [username, username]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = admins[0];
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query("UPDATE admins SET last_login = datetime('now') WHERE id = ?", [admin.id]);

    const token = jwt.sign(
      { id: admin.id, username: admin.username, full_name: admin.full_name, role: admin.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        full_name: admin.full_name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/admin/me - Get current admin profile
router.get('/me', authenticateAdmin, async (req, res) => {
  try {
    const [admins] = await pool.query(
      'SELECT id, username, email, full_name, role, last_login, created_at FROM admins WHERE id = ?',
      [req.admin.id]
    );
    if (admins.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json(admins[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin' });
  }
});

// GET /api/admin/dashboard - Dashboard statistics
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    // Today's bookings
    const [todayBookings] = await pool.query(
      "SELECT COUNT(*) AS total, COALESCE(SUM(final_amount), 0) AS revenue FROM bookings WHERE date(booking_date) = date('now')"
    );

    // Total active buses
    const [activeBuses] = await pool.query(
      'SELECT COUNT(*) AS total FROM buses WHERE is_active = TRUE'
    );

    // Total routes
    const [activeRoutes] = await pool.query(
      'SELECT COUNT(*) AS total FROM routes WHERE is_active = TRUE'
    );

    // Total users
    const [totalUsers] = await pool.query(
      'SELECT COUNT(*) AS total FROM users WHERE is_active = TRUE'
    );

    // Total revenue all time
    const [totalRevenue] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE payment_status = 'success'"
    );

    // Pending bookings
    const [pendingBookings] = await pool.query(
      "SELECT COUNT(*) AS total FROM bookings WHERE status = 'pending'"
    );

    // Bookings by status
    const [bookingsByStatus] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM bookings GROUP BY status'
    );

    // Monthly revenue (last 6 months)
    const [monthlyRevenue] = await pool.query(`
      SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount) AS revenue
      FROM payments
      WHERE payment_status = 'success' AND payment_date >= datetime('now', '-6 months')
      GROUP BY month ORDER BY month
    `);

    res.json({
      today_bookings: todayBookings[0].total,
      today_revenue: todayBookings[0].revenue,
      active_buses: activeBuses[0].total,
      active_routes: activeRoutes[0].total,
      total_users: totalUsers[0].total,
      total_revenue: totalRevenue[0].total,
      pending_bookings: pendingBookings[0].total,
      bookings_by_status: bookingsByStatus,
      monthly_revenue: monthlyRevenue
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/admin/settings
router.get('/settings', authenticateAdmin, async (req, res) => {
  res.json({
    app_name: 'CAG Bus Booking System',
    version: '1.0.0',
    timezone: 'UTC',
    currency: 'USD',
    tax_rate: 5,
    booking_prefix: 'CAG',
    maintenance_mode: false,
    payment_gateway: 'Simulated',
    max_seats_per_booking: 10,
    cancellation_policy: 'Free cancellation up to 24 hours before departure'
  });
});

module.exports = router;
