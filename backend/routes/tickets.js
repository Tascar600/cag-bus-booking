const express = require('express');
const pool = require('../config/db');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// GET /api/tickets/:bookingReference - Get all tickets for a booking
router.get('/:bookingReference', authenticateUser, async (req, res) => {
  try {
    const [bookings] = await pool.query(
      'SELECT id, user_id, booking_reference FROM bookings WHERE booking_reference = ?',
      [req.params.bookingReference]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [tickets] = await pool.query(`
      SELECT t.*, bp.full_name AS passenger_name, bp.age, bp.gender,
             s.seat_number, s.seat_type, s.seat_row, s.seat_column
      FROM tickets t
      JOIN booking_passengers bp ON t.passenger_id = bp.id
      JOIN seats s ON bp.seat_id = s.id
      WHERE t.booking_id = ?
    `, [booking.id]);

    const [bookingDetails] = await pool.query(`
      SELECT b.*, r.origin, r.destination, s.departure_time, s.arrival_time,
             bus.bus_number, bus.bus_type
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      JOIN buses bus ON s.bus_id = bus.id
      WHERE b.id = ?
    `, [booking.id]);

    res.json({
      booking: bookingDetails[0],
      tickets
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

module.exports = router;
