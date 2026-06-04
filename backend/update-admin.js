const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function update() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cag_bus_booking',
  });

  const hash = await bcrypt.hash('1234', 12);
  await conn.query(
    'UPDATE admins SET email = ?, password_hash = ? WHERE username = ?',
    ['ruvmudzingwa@gmail.com', hash, 'admin']
  );
  console.log('Admin updated: ruvmudzingwa@gmail.com / 1234');

  const [rows] = await conn.query('SELECT id, username, email, role FROM admins WHERE username = ?', ['admin']);
  console.log('Verified:', rows[0]);

  await conn.end();
  process.exit(0);
}

update().catch(err => { console.error(err); process.exit(1); });
