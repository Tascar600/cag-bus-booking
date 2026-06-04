const express = require('express');
const pool = require('../config/db');
const { authenticateUser } = require('../middleware/auth');
const { authenticateAdmin } = require('../middleware/adminAuth');
const { generateBookingReference, generateTicketNumber, generateTransactionId } = require('../utils/helpers');
const { generateQRCode, generateTicketQRData } = require('../utils/qrCode');

const router = express.Router();

// POST /api/bookings/create - Create a new booking
router.post('/create', authenticateUser, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { schedule_id, travel_date, seat_ids, passengers, contact_phone, contact_email, special_requests } = req.body;

    if (!schedule_id || !travel_date || !seat_ids || !passengers || !contact_phone) {
      return res.status(400).json({ error: 'Missing required booking information' });
    }

    // Verify seats are still available
    const seatPlaceholders = seat_ids.map(() => '?').join(',');
    const [bookedSeats] = await connection.query(
      `SELECT id, seat_number, price FROM seats WHERE id IN (${seatPlaceholders}) AND schedule_id = ? AND travel_date = ? AND is_booked = TRUE`,
      [...seat_ids, schedule_id, travel_date]
    );

    if (bookedSeats.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        error: 'Some seats are no longer available',
        booked_seats: bookedSeats.map(s => s.seat_number)
      });
    }

    // Calculate total
    const seatIdPlaceholders = seat_ids.map(() => '?').join(',');
    const [seatPrices] = await connection.query(
      `SELECT SUM(price) AS total FROM seats WHERE id IN (${seatIdPlaceholders})`,
      [...seat_ids]
    );
    const subtotal = parseFloat(seatPrices[0].total) || 0;
    const tax = subtotal * 0.05;
    const final_amount = subtotal + tax;

    // Create booking
    const booking_reference = generateBookingReference();
    const [bookingResult] = await connection.query(
      'INSERT INTO bookings (booking_reference, user_id, schedule_id, travel_date, total_amount, tax_amount, final_amount, status, passenger_count, contact_phone, contact_email, special_requests) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [booking_reference, req.user.id, schedule_id, travel_date, subtotal, tax, final_amount, 'pending', passengers.length, contact_phone, contact_email, special_requests || null]
    );

    const booking_id = bookingResult.insertId;

    // Create passengers and mark seats, generate tickets
    const tickets = [];
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];

      // Mark seat as booked
      await connection.query(
        'UPDATE seats SET is_booked = TRUE WHERE id = ?',
        [seat_ids[i]]
      );

      // Create passenger record
      const [passResult] = await connection.query(
        'INSERT INTO booking_passengers (booking_id, seat_id, full_name, age, gender, id_proof_type, id_proof_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [booking_id, seat_ids[i], p.full_name, p.age || null, p.gender || null, p.id_proof_type || null, p.id_proof_number || null]
      );

      // Get seat info
      const [seatInfo] = await connection.query(
        'SELECT seat_number FROM seats WHERE id = ?',
        [seat_ids[i]]
      );

      // Generate ticket
      const ticket_number = generateTicketNumber();
      const ticketData = { booking_reference, ticket_number, passenger: p.full_name, seat: seatInfo[0].seat_number };
      const qrCode = await generateQRCode(ticketData);

      await connection.query(
        'INSERT INTO tickets (booking_id, passenger_id, seat_number, ticket_number, qr_code) VALUES (?, ?, ?, ?, ?)',
        [booking_id, passResult.insertId, seatInfo[0].seat_number, ticket_number, qrCode]
      );

      tickets.push({
        ticket_number,
        seat_number: seatInfo[0].seat_number,
        passenger_name: p.full_name,
        qr_code: qrCode
      });
    }

    // Create transaction
    const transaction_id = generateTransactionId();

    await connection.commit();

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking_id,
        booking_reference,
        final_amount,
        status: 'pending',
        passenger_count: passengers.length,
        tickets
      },
      transaction_id
    });
  } catch (err) {
    await connection.rollback();
    console.error('Booking creation error:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  } finally {
    connection.release();
  }
});

// GET /api/bookings/my-bookings - Get current user's bookings
router.get('/my-bookings', authenticateUser, async (req, res) => {
  try {
    const [bookings] = await pool.query(`
      SELECT b.*, r.origin, r.destination, s.departure_time, s.arrival_time,
             bus.bus_number, bus.bus_type, pay.payment_status
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      JOIN buses bus ON s.bus_id = bus.id
      LEFT JOIN payments pay ON b.id = pay.booking_id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC
    `, [req.user.id]);

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:reference - Get booking by reference
router.get('/:reference', async (req, res) => {
  try {
    const [bookings] = await pool.query(`
      SELECT b.*, r.origin, r.destination, s.departure_time, s.arrival_time, s.base_price,
             bus.bus_number, bus.bus_type, bus.bus_type, bus.amenities
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      JOIN buses bus ON s.bus_id = bus.id
      WHERE b.booking_reference = ?
    `, [req.params.reference]);

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    // Get passengers and tickets
    const [passengers] = await pool.query(`
      SELECT bp.*, s.seat_number, t.ticket_number, t.qr_code
      FROM booking_passengers bp
      JOIN seats s ON bp.seat_id = s.id
      JOIN tickets t ON bp.id = t.passenger_id
      WHERE bp.booking_id = ?
    `, [booking.id]);

    // Get payment info
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE booking_id = ?',
      [booking.id]
    );

    booking.passengers = passengers;
    booking.payment = payments[0] || null;

    if (booking.amenities && typeof booking.amenities === 'string') {
      try { booking.amenities = JSON.parse(booking.amenities); } catch(e) { booking.amenities = []; }
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// PUT /api/bookings/:id/cancel - Cancel a booking
router.put('/:id/cancel', authenticateUser, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [bookings] = await connection.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (bookings.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];
    if (booking.status === 'cancelled' || booking.status === 'refunded' || booking.status === 'completed') {
      await connection.rollback();
      return res.status(400).json({ error: `Booking cannot be cancelled (status: ${booking.status})` });
    }

    // Free up seats
    await connection.query(
      'UPDATE seats SET is_booked = FALSE WHERE id IN (SELECT seat_id FROM booking_passengers WHERE booking_id = ?)',
      [req.params.id]
    );

    // Update booking status
    await connection.query(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [booking.payment ? 'refunded' : 'cancelled', req.params.id]
    );

    // Update payment if exists
    if (booking.payment) {
      await connection.query(
        'UPDATE payments SET payment_status = ? WHERE booking_id = ?',
        ['refunded', req.params.id]
      );
    }

    await connection.commit();
    res.json({ message: 'Booking cancelled successfully', status: 'cancelled' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    connection.release();
  }
});

// GET /api/bookings/admin/all - Get all bookings (admin)
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const { status, from, to } = req.query;
    let query = `
      SELECT b.*, u.full_name AS user_name, u.email AS user_email,
             r.origin, r.destination, s.departure_time,
             bus.bus_number, pay.payment_status
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN schedules s ON b.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      JOIN buses bus ON s.bus_id = bus.id
      LEFT JOIN payments pay ON b.id = pay.booking_id
      WHERE 1=1
    `;
    const params = [];

    if (status) { query += ' AND b.status = ?'; params.push(status); }
    if (from) { query += ' AND b.travel_date >= ?'; params.push(from); }
    if (to) { query += ' AND b.travel_date <= ?'; params.push(to); }

    query += ' ORDER BY b.booking_date DESC';

    const [bookings] = await pool.query(query, params);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// PUT /api/bookings/admin/:id/status - Update booking status (admin)
router.put('/admin/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['confirmed', 'cancelled', 'completed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: `Booking status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

module.exports = router;
