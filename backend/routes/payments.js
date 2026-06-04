const express = require('express');
const pool = require('../config/db');
const { authenticateUser } = require('../middleware/auth');
const { authenticateAdmin } = require('../middleware/adminAuth');
const { generateTransactionId } = require('../utils/helpers');

const router = express.Router();

const ECOCASH_NUMBER = '0781059106';
const ECOCASH_NAME = 'Takudzwa Isaya Masiwa';
const ONEMONE_NUMBER = '0781059106';
const ONEMONE_NAME = 'Takudzwa Isaya Masiwa';

router.post('/process', authenticateUser, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { booking_id, payment_method } = req.body;

    if (!booking_id || !payment_method) {
      return res.status(400).json({ error: 'Missing payment information' });
    }

    const [bookings] = await connection.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [booking_id, req.user.id]
    );

    if (bookings.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];
    if (booking.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: `Booking is already ${booking.status}` });
    }

    const transaction_id = generateTransactionId();
    const validMethods = ['ecocash', 'onemoney', 'zimswitch', 'cash_on_departure'];

    if (!validMethods.includes(payment_method)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    if (payment_method === 'cash_on_departure') {
      await connection.query(
        'INSERT INTO payments (booking_id, transaction_id, amount, payment_method, payment_status, gateway_response) VALUES (?, ?, ?, ?, ?, ?)',
        [booking_id, transaction_id, booking.final_amount, 'cash_on_departure', 'pending', JSON.stringify({
          transaction_id, status: 'pending', message: 'Pay on departure',
          instructions: 'Pay cash to the bus conductor before boarding.',
          timestamp: new Date().toISOString()
        })]
      );

      await connection.query(
        'UPDATE bookings SET status = ? WHERE id = ?',
        ['confirmed', booking_id]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: 'Booking confirmed! Please pay cash on departure.',
        transaction_id,
        booking_reference: booking.booking_reference,
        amount: booking.final_amount,
        status: 'confirmed',
        payment_method: 'cash_on_departure',
        payment_instructions: 'Pay cash to the bus conductor before boarding.'
      });
    }

    if (payment_method === 'ecocash' || payment_method === 'onemoney') {
      const number = payment_method === 'ecocash' ? ECOCASH_NUMBER : ONEMONE_NUMBER;
      const name = payment_method === 'ecocash' ? ECOCASH_NAME : ONEMONE_NAME;
      const label = payment_method === 'ecocash' ? 'EcoCash' : 'OneMoney';

      const gateway_response = {
        transaction_id,
        status: 'pending',
        message: `Send ${label} payment to ${number} (${name})`,
        instructions: `Open your ${label} app, send exactly $${booking.final_amount} to ${number} (${name}), then your booking will be confirmed.`,
        merchant_number: number,
        merchant_name: name,
        amount: booking.final_amount,
        timestamp: new Date().toISOString()
      };

      await connection.query(
        'INSERT INTO payments (booking_id, transaction_id, amount, payment_method, payment_status, gateway_response) VALUES (?, ?, ?, ?, ?, ?)',
        [booking_id, transaction_id, booking.final_amount, payment_method, 'pending', JSON.stringify(gateway_response)]
      );

      await connection.query(
        'UPDATE bookings SET status = ? WHERE id = ?',
        ['confirmed', booking_id]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: `Booking confirmed! Send payment via ${label} to ${number} (${name}).`,
        transaction_id,
        booking_reference: booking.booking_reference,
        amount: booking.final_amount,
        status: 'confirmed',
        payment_method,
        merchant_number: number,
        merchant_name: name,
        payment_instructions: `Send $${booking.final_amount} via ${label} to ${number} (${name})`
      });
    }

    if (payment_method === 'zimswitch') {
      const { card_number, card_holder, expiry, cvv } = req.body;

      if (!card_number || !card_holder || !expiry || !cvv) {
        await connection.rollback();
        return res.status(400).json({ error: 'Card details are required for ZimSwitch payments' });
      }

      const isSuccess = Math.random() < 0.85;
      await new Promise(resolve => setTimeout(resolve, 800));

      const gateway_response = JSON.stringify({
        transaction_id,
        status: isSuccess ? 'success' : 'failed',
        message: isSuccess ? 'ZimSwitch payment approved' : 'Card declined by bank',
        card_last4: card_number.slice(-4),
        card_holder,
        timestamp: new Date().toISOString(),
        simulated: true
      });

      await connection.query(
        'INSERT INTO payments (booking_id, transaction_id, amount, payment_method, payment_status, gateway_response) VALUES (?, ?, ?, ?, ?, ?)',
        [booking_id, transaction_id, booking.final_amount, 'zimswitch', isSuccess ? 'success' : 'failed', gateway_response]
      );

      if (isSuccess) {
        await connection.query(
          'UPDATE bookings SET status = ? WHERE id = ?',
          ['confirmed', booking_id]
        );
        await connection.commit();
        return res.json({
          success: true,
          message: 'ZimSwitch payment successful! Booking confirmed.',
          transaction_id,
          booking_reference: booking.booking_reference,
          amount: booking.final_amount,
          status: 'confirmed',
          payment_method: 'zimswitch'
        });
      } else {
        await connection.query(
          'UPDATE seats SET is_booked = FALSE WHERE id IN (SELECT seat_id FROM booking_passengers WHERE booking_id = ?)',
          [booking_id]
        );
        await connection.query(
          'UPDATE bookings SET status = ? WHERE id = ?',
          ['cancelled', booking_id]
        );
        await connection.commit();
        return res.json({
          success: false,
          message: 'ZimSwitch payment failed. Please try again.',
          transaction_id,
          status: 'failed',
          payment_method: 'zimswitch',
          retry_allowed: true
        });
      }
    }
  } catch (err) {
    await connection.rollback();
    console.error('Payment processing error:', err);
    res.status(500).json({ error: 'Payment processing failed' });
  } finally {
    connection.release();
  }
});

router.get('/reports', authenticateAdmin, async (req, res) => {
  try {
    const { from, to, payment_status } = req.query;
    let query = `
      SELECT p.*, b.booking_reference, u.full_name AS user_name, u.email AS user_email
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (from) { query += ' AND p.payment_date >= ?'; params.push(from); }
    if (to) { query += ' AND p.payment_date <= ?'; params.push(to); }
    if (payment_status) { query += ' AND p.payment_status = ?'; params.push(payment_status); }
    query += ' ORDER BY p.payment_date DESC';
    const [payments] = await pool.query(query, params);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment reports' });
  }
});

module.exports = router;
