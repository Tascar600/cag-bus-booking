const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

const config = {};

if (process.env.DATABASE_URL) {
  config.uri = process.env.DATABASE_URL;
} else {
  config.host = process.env.DB_HOST || 'localhost';
  config.port = parseInt(process.env.DB_PORT) || 3306;
  config.user = process.env.DB_USER || 'root';
  config.password = process.env.DB_PASSWORD || '';
  config.database = process.env.DB_NAME || 'cag_bus_booking';
}

config.waitForConnections = true;
config.connectionLimit = 10;
config.queueLimit = 0;

if (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production') {
  config.ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
}

const pool = mysql.createPool(config);

pool.getConnection()
  .then(conn => {
    console.log('Database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
  });

module.exports = pool;
