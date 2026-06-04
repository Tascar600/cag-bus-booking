const express = require('express');
const pool = require('../config/db');
const { authenticateAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// GET /api/users - List all customers (admin)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT id, full_name, email, phone, address, is_active, created_at FROM users';
    const params = [];

    if (search) {
      query += ' WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const [users] = await pool.query(query, params);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/stats - User statistics (admin)
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [totalUsers] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE is_active = TRUE');
    const [newUsers] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE created_at >= datetime('now', '-30 days')");
    res.json({
      total: totalUsers[0].total,
      new_last_30_days: newUsers[0].total
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// GET /api/users/:id - Get user details (admin)
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, full_name, email, phone, address, date_of_birth, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's booking count
    const [bookingCount] = await pool.query(
      'SELECT COUNT(*) AS total, SUM(final_amount) AS total_spent FROM bookings WHERE user_id = ?',
      [req.params.id]
    );

    const user = users[0];
    user.total_bookings = bookingCount[0].total || 0;
    user.total_spent = bookingCount[0].total_spent || 0;

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
