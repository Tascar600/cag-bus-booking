const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [drivers] = await pool.query(
      'SELECT d.*, (SELECT COUNT(*) FROM schedules s WHERE s.driver_id = d.id AND s.is_active = TRUE) AS active_schedules FROM drivers d WHERE d.is_active = TRUE ORDER BY d.full_name'
    );
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

module.exports = router;
