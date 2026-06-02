const express = require('express');
const pool = require('../config/db');
const { authenticateAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// GET /api/buses - List all active buses
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM buses WHERE is_active = TRUE';
    const params = [];

    if (type) {
      query += ' AND bus_type = ?';
      params.push(type);
    }

    query += ' ORDER BY bus_number';
    const [buses] = await pool.query(query, params);
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

// GET /api/buses/:id - Get bus by ID
router.get('/:id', async (req, res) => {
  try {
    const [buses] = await pool.query('SELECT * FROM buses WHERE id = ?', [req.params.id]);
    if (buses.length === 0) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    if (buses[0].amenities && typeof buses[0].amenities === 'string') {
      buses[0].amenities = JSON.parse(buses[0].amenities);
    }
    res.json(buses[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bus' });
  }
});

// POST /api/buses - Add new bus (admin)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { bus_number, plate_number, bus_type, capacity, seat_layout, amenities } = req.body;
    const amenitiesStr = amenities ? (typeof amenities === 'string' ? amenities : JSON.stringify(amenities)) : '[]';

    const [result] = await pool.query(
      'INSERT INTO buses (bus_number, plate_number, bus_type, capacity, seat_layout, amenities) VALUES (?, ?, ?, ?, ?, ?)',
      [bus_number, plate_number, bus_type, capacity, seat_layout || '2x2', amenitiesStr]
    );

    res.status(201).json({ message: 'Bus added successfully', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Bus number or plate already exists' });
    }
    res.status(500).json({ error: 'Failed to add bus' });
  }
});

// PUT /api/buses/:id - Update bus (admin)
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { bus_number, plate_number, bus_type, capacity, seat_layout, amenities, is_active } = req.body;
    const amenitiesStr = amenities ? JSON.stringify(amenities) : null;

    await pool.query(
      'UPDATE buses SET bus_number=?, plate_number=?, bus_type=?, capacity=?, seat_layout=?, amenities=?, is_active=? WHERE id=?',
      [bus_number, plate_number, bus_type, capacity, seat_layout, amenitiesStr, is_active, req.params.id]
    );

    res.json({ message: 'Bus updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bus' });
  }
});

// DELETE /api/buses/:id - Soft delete bus (admin)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE buses SET is_active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bus deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate bus' });
  }
});

module.exports = router;
