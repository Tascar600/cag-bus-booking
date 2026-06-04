const express = require('express');
const pool = require('../config/db');
const { authenticateAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// GET /api/routes - List all routes
router.get('/', async (req, res) => {
  try {
    const [routes] = await pool.query(
      'SELECT * FROM routes WHERE is_active = TRUE ORDER BY origin, destination'
    );
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// GET /api/routes/search - Search routes by origin/destination
router.get('/search', async (req, res) => {
  try {
    const { origin, destination } = req.query;
    let query = 'SELECT * FROM routes WHERE is_active = TRUE';
    const params = [];

    if (origin) {
      query += ' AND origin LIKE ?';
      params.push(`%${origin}%`);
    }
    if (destination) {
      query += ' AND destination LIKE ?';
      params.push(`%${destination}%`);
    }

    const [routes] = await pool.query(query, params);
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search routes' });
  }
});

// GET /api/routes/origins - Get distinct origins
router.get('/origins', async (req, res) => {
  try {
    const [origins] = await pool.query(
      'SELECT DISTINCT origin FROM routes WHERE is_active = TRUE ORDER BY origin'
    );
    res.json(origins.map(r => r.origin));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch origins' });
  }
});

// GET /api/routes/destinations - Get destinations for an origin
router.get('/destinations', async (req, res) => {
  try {
    const { origin } = req.query;
    let query = 'SELECT DISTINCT destination FROM routes WHERE is_active = TRUE';
    const params = [];
    if (origin) {
      query += ' AND origin = ?';
      params.push(origin);
    }
    query += ' ORDER BY destination';
    const [destinations] = await pool.query(query, params);
    res.json(destinations.map(r => r.destination));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

// GET /api/routes/:id
router.get('/:id', async (req, res) => {
  try {
    const [routes] = await pool.query('SELECT * FROM routes WHERE id = ?', [req.params.id]);
    if (routes.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json(routes[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

// POST /api/routes - Add route (admin) — auto-creates a schedule so it appears in customer search
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { origin, destination, distance_km, duration_minutes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO routes (origin, destination, distance_km, duration_minutes) VALUES (?, ?, ?, ?)',
      [origin, destination, distance_km, duration_minutes]
    );
    const routeId = result.insertId;

    // Auto-create a schedule so the route appears in customer search
    if (distance_km && duration_minutes) {
      const [buses] = await pool.query('SELECT id, bus_type FROM buses WHERE is_active = TRUE LIMIT 1');
      const [drivers] = await pool.query('SELECT id FROM drivers WHERE is_active = TRUE LIMIT 1');
      if (buses.length > 0 && drivers.length > 0) {
        const bus = buses[0];
        const driver = drivers[0];
        const pricePerKm = { standard: 0.08, ac: 0.12, luxury: 0.18, sleeper: 0.25 };
        const rate = pricePerKm[bus.bus_type] || 0.1;
        const price = Math.max(Math.round(distance_km * rate * 100) / 100, 5);
        const depTime = '08:00';
        const depMin = 8 * 60;
        const arrMin = depMin + duration_minutes;
        const arrTime = String(Math.floor(arrMin / 60) % 24).padStart(2,'0') + ':' + String(arrMin % 60).padStart(2,'0');
        await pool.query(
          'INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, base_price, operating_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [routeId, bus.id, driver.id, depTime, arrTime, price, 'mon,tue,wed,thu,fri,sat,sun']
        );
      }
    }

    res.status(201).json({ message: 'Route added with schedule', id: routeId });
  } catch (err) {
    console.error('Add route error:', err);
    res.status(500).json({ error: 'Failed to add route' });
  }
});

// PUT /api/routes/:id - Update route (admin)
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { origin, destination, distance_km, duration_minutes, is_active } = req.body;
    await pool.query(
      'UPDATE routes SET origin=?, destination=?, distance_km=?, duration_minutes=?, is_active=? WHERE id=?',
      [origin, destination, distance_km, duration_minutes, is_active, req.params.id]
    );
    res.json({ message: 'Route updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update route' });
  }
});

// DELETE /api/routes/:id
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE routes SET is_active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Route deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

module.exports = router;
