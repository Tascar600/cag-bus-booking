const express = require('express');
const pool = require('../config/db');
const { authenticateUser } = require('../middleware/auth');
const { authenticateAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// POST /api/reviews - Submit a review
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { bus_id, booking_id, rating, comment } = req.body;

    if (!bus_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Bus ID and rating (1-5) are required' });
    }

    // Check if user already reviewed this bus
    const [existing] = await pool.query(
      'SELECT id FROM reviews WHERE user_id = ? AND bus_id = ?',
      [req.user.id, bus_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this bus' });
    }

    const [result] = await pool.query(
      'INSERT INTO reviews (user_id, bus_id, booking_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, bus_id, booking_id || null, rating, comment || null]
    );

    res.status(201).json({ message: 'Review submitted', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /api/reviews/bus/:busId - Get reviews for a bus
router.get('/bus/:busId', async (req, res) => {
  try {
    const [reviews] = await pool.query(`
      SELECT r.*, u.full_name AS user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.bus_id = ? AND r.is_approved = TRUE
      ORDER BY r.created_at DESC
    `, [req.params.busId]);

    // Calculate average rating
    const avgResult = await pool.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM reviews WHERE bus_id = ? AND is_approved = TRUE',
      [req.params.busId]
    );

    res.json({
      reviews,
      avg_rating: parseFloat(avgResult[0][0]?.avg_rating || 0).toFixed(1),
      total_reviews: avgResult[0][0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/admin/all - All reviews (admin)
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const [reviews] = await pool.query(`
      SELECT r.*, u.full_name AS user_name, u.email AS user_email, b.bus_number
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN buses b ON r.bus_id = b.id
      ORDER BY r.created_at DESC
    `);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// PUT /api/reviews/admin/:id/approve - Approve review (admin)
router.put('/admin/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE reviews SET is_approved = ? WHERE id = ?', [req.body.approve, req.params.id]);
    res.json({ message: 'Review updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

module.exports = router;
