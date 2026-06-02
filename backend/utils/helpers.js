const { v4: uuidv4 } = require('uuid');

const generateBookingReference = () => {
  const prefix = 'CAG';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

const generateTicketNumber = () => {
  const prefix = 'TKT';
  const random = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `${prefix}${random}`;
};

const generateTransactionId = () => {
  const prefix = 'TXN';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

const calculateTotalPrice = (basePrice, seatCount, taxRate = 0.05) => {
  const subtotal = basePrice * seatCount;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  const re = /^[+]?[\d\s()-]{10,15}$/;
  return re.test(phone);
};

const sanitizeInput = (str) => {
  return str.replace(/[<>"'&]/g, '');
};

module.exports = {
  generateBookingReference,
  generateTicketNumber,
  generateTransactionId,
  calculateTotalPrice,
  validateEmail,
  validatePhone,
  sanitizeInput
};
