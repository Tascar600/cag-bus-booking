const express = require('express');
const pool = require('../config/db');
const { authenticateAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// GET /api/schedules - List schedules with optional filters
router.get('/', async (req, res) => {
  try {
    const { origin, destination, date } = req.query;

    let query = `
      SELECT s.*, r.origin, r.destination, r.distance_km, r.duration_minutes,
             b.bus_number, b.bus_type, b.capacity, b.seat_layout, b.amenities,
             d.full_name AS driver_name
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      JOIN buses b ON s.bus_id = b.id
      LEFT JOIN drivers d ON s.driver_id = d.id
      WHERE s.is_active = TRUE AND r.is_active = TRUE AND b.is_active = TRUE
    `;
    const params = [];

    if (origin) {
      query += ' AND r.origin LIKE ?';
      params.push(`%${origin}%`);
    }
    if (destination) {
      query += ' AND r.destination LIKE ?';
      params.push(`%${destination}%`);
    }
    if (date) {
      query += ' AND ? BETWEEN s.start_date AND s.end_date';
      params.push(date);
    }

    query += ' ORDER BY r.origin, s.departure_time';

    const [schedules] = await pool.query(query, params);

    const enriched = schedules.map(s => {
      if (s.amenities && typeof s.amenities === 'string') {
        try { s.amenities = JSON.parse(s.amenities); } catch(e) { s.amenities = []; }
      }
      return s;
    });

    res.json(enriched);
  } catch (err) {
    console.error('Schedules error:', err);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// GET /api/schedules/available - Get available schedules for a route+date
router.get('/available', async (req, res) => {
  try {
    const { origin, destination, date } = req.query;

    if (!origin || !destination || !date) {
      return res.status(400).json({ error: 'origin, destination, and date are required' });
    }

    const [schedules] = await pool.query(`
      SELECT s.*, r.origin, r.destination, r.distance_km, r.duration_minutes,
             b.bus_number, b.bus_type, b.capacity, b.seat_layout, b.amenities,
             (b.capacity - COALESCE(booked.booked_count, 0)) AS available_seats
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      JOIN buses b ON s.bus_id = b.id
      LEFT JOIN (
        SELECT schedule_id, travel_date, COUNT(*) AS booked_count
        FROM seats
        WHERE travel_date = ? AND is_booked = TRUE
        GROUP BY schedule_id, travel_date
      ) booked ON s.id = booked.schedule_id AND booked.travel_date = ?
      WHERE r.origin LIKE ? AND r.destination LIKE ?
        AND s.is_active = TRUE AND r.is_active = TRUE AND b.is_active = TRUE
      ORDER BY s.departure_time
    `, [date, date, `%${origin}%`, `%${destination}%`]);

    const enriched = schedules.map(s => {
      if (s.amenities && typeof s.amenities === 'string') {
        try { s.amenities = JSON.parse(s.amenities); } catch(e) { s.amenities = []; }
      }
      s.available_seats = s.available_seats || s.capacity;
      return s;
    });

    res.json(enriched);
  } catch (err) {
    console.error('Available schedules error:', err);
    res.status(500).json({ error: 'Failed to fetch available schedules' });
  }
});

// GET /api/schedules/:id
router.get('/:id', async (req, res) => {
  try {
    const [schedules] = await pool.query(`
      SELECT s.*, r.origin, r.destination, r.distance_km, r.duration_minutes,
             b.bus_number, b.bus_type, b.capacity, b.seat_layout, b.amenities,
             d.full_name AS driver_name, d.phone AS driver_phone
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      JOIN buses b ON s.bus_id = b.id
      LEFT JOIN drivers d ON s.driver_id = d.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const s = schedules[0];
    if (s.amenities && typeof s.amenities === 'string') {
      try { s.amenities = JSON.parse(s.amenities); } catch(e) { s.amenities = []; }
    }

    res.json(s);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// POST /api/schedules - Add schedule (admin)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { route_id, bus_id, driver_id, departure_time, arrival_time, base_price, operating_days } = req.body;
    const [result] = await pool.query(
      'INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, base_price, operating_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [route_id, bus_id, driver_id || null, departure_time, arrival_time, base_price, operating_days || 'mon,tue,wed,thu,fri,sat,sun']
    );
    res.status(201).json({ message: 'Schedule created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// PUT /api/schedules/:id
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { route_id, bus_id, driver_id, departure_time, arrival_time, base_price, operating_days, is_active } = req.body;
    await pool.query(
      'UPDATE schedules SET route_id=?, bus_id=?, driver_id=?, departure_time=?, arrival_time=?, base_price=?, operating_days=?, is_active=? WHERE id=?',
      [route_id, bus_id, driver_id, departure_time, arrival_time, base_price, operating_days, is_active, req.params.id]
    );
    res.json({ message: 'Schedule updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE schedules SET is_active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Schedule deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

module.exports = router;
