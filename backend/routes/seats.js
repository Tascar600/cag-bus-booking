const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/seats/:scheduleId/:date - Get seat layout for a schedule+date
router.get('/:scheduleId/:date', async (req, res) => {
  try {
    const { scheduleId, date } = req.params;

    // First get the schedule and bus info
    const [schedules] = await pool.query(`
      SELECT s.*, b.capacity, b.seat_layout, b.bus_type, b.bus_number
      FROM schedules s
      JOIN buses b ON s.bus_id = b.id
      WHERE s.id = ?
    `, [scheduleId]);

    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const schedule = schedules[0];

    // Get or create seats for this date
    const [existingSeats] = await pool.query(
      'SELECT * FROM seats WHERE schedule_id = ? AND travel_date = ? ORDER BY seat_row, seat_column',
      [scheduleId, date]
    );

    if (existingSeats.length === 0) {
      // Generate seats based on bus capacity
      const seats = [];
      const cols = schedule.seat_layout === '2x2' ? 4 : 3;
      const rows = Math.ceil(schedule.capacity / cols);
      let seatNum = 1;

      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const seatCol = String.fromCharCode(64 + c);
          const seatNumber = `${r}${seatCol}`;
          let seatType = 'aisle';
          if (c === 1 || c === cols) seatType = 'window';
          else if (cols === 4 && (c === 2 || c === 3)) seatType = 'middle';

          seats.push([
            scheduleId, date, seatNumber, r, c, seatType,
            schedule.base_price, false
          ]);
          seatNum++;
          if (seatNum > schedule.capacity) break;
        }
        if (seatNum > schedule.capacity) break;
      }

      if (seats.length > 0) {
        await pool.query(
          'INSERT INTO seats (schedule_id, travel_date, seat_number, seat_row, seat_column, seat_type, price, is_booked) VALUES ?',
          [seats]
        );
      }

      const [newSeats] = await pool.query(
        'SELECT * FROM seats WHERE schedule_id = ? AND travel_date = ? ORDER BY seat_row, seat_column',
        [scheduleId, date]
      );

      return res.json({
        schedule,
        seats: newSeats,
        layout: schedule.seat_layout,
        rows: rows,
        cols: cols
      });
    }

    res.json({
      schedule,
      seats: existingSeats,
      layout: schedule.seat_layout,
      rows: Math.ceil(schedule.capacity / (schedule.seat_layout === '2x2' ? 4 : 3)),
      cols: schedule.seat_layout === '2x2' ? 4 : 3
    });
  } catch (err) {
    console.error('Seats error:', err);
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

// POST /api/seats/check-availability - Check if selected seats are available
router.post('/check-availability', async (req, res) => {
  try {
    const { schedule_id, travel_date, seat_ids } = req.body;
    const placeholders = seat_ids.map(() => '?').join(',');
    const [booked] = await pool.query(
      `SELECT id, seat_number FROM seats WHERE id IN (${placeholders}) AND schedule_id = ? AND travel_date = ? AND is_booked = TRUE`,
      [...seat_ids, schedule_id, travel_date]
    );

    if (booked.length > 0) {
      return res.json({
        available: false,
        booked_seats: booked.map(b => b.seat_number)
      });
    }

    res.json({ available: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

module.exports = router;
