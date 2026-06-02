const QRCode = require('qrcode');

const generateQRCode = async (data) => {
  try {
    const qrData = typeof data === 'string' ? data : JSON.stringify(data);
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1a56db',
        light: '#ffffff'
      }
    });
    return qrCodeDataURL;
  } catch (err) {
    console.error('QR Code generation failed:', err);
    return null;
  }
};

const generateTicketQRData = (ticket) => {
  return {
    ticket: ticket.ticket_number,
    booking: ticket.booking_reference,
    passenger: ticket.passenger_name,
    seat: ticket.seat_number,
    bus: ticket.bus_number,
    date: ticket.travel_date,
    departure: ticket.departure_time,
    origin: ticket.origin,
    destination: ticket.destination
  };
};

module.exports = { generateQRCode, generateTicketQRData };
