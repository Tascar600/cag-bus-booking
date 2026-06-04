const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'cag_bus.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

class TxConnection {
  constructor(d) { this.db = d; }
  async beginTransaction() { this.db.exec('BEGIN'); }
  async commit() { this.db.exec('COMMIT'); }
  async rollback() { this.db.exec('ROLLBACK'); }
  prepare(sql) { return this.db.prepare(sql); }
  exec(sql) { return this.db.exec(sql); }
  query(sql, params = []) {
    const trimmed = sql.trim();
    const isSelect = /^(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(trimmed);
    if (isSelect) {
      const rows = this.db.prepare(sql).all(...(params || []));
      return [rows, {}];
    }
    const result = this.db.prepare(sql).run(...(params || []));
    return [{ affectedRows: result.changes, insertId: result.lastInsertRowid }];
  }
  release() {}
}

function makeQuery(dbInstance) {
  return function query(sql, params = []) {
    const trimmed = sql.trim();
    const isSelect = /^(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(trimmed);

    if (isSelect) {
      try {
        const rows = dbInstance.prepare(sql).all(...(params || []));
        return [rows, {}];
      } catch (err) {
        console.error('SQL select error:', sql, err.message);
        throw err;
      }
    }

    if (/^INSERT\s+INTO\b/i.test(trimmed) && params && Array.isArray(params) && params.length > 0 && Array.isArray(params[0]) && params[0].length && Array.isArray(params[0][0])) {
      const rows = params[0];
      const clean = sql.replace(/\s*VALUES\s*\?$/, '').replace(/\s*VALUES\s*\(.*\)\s*$/, '');
      const stmt = dbInstance.prepare(sql.includes('(') && !sql.includes('VALUES ?') ? sql : '');
      const colsMatch = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
      let insertSql;
      if (colsMatch && !sql.includes('VALUES ?')) {
        const placeholders = rows[0].map(() => '?').join(',');
        insertSql = `INSERT INTO ${sql.match(/INTO\s+(\w+)/i)[1]} (${colsMatch[1]}) VALUES (${placeholders})`;
      } else {
        const tableMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
        insertSql = sql.includes('VALUES ?') ? sql.replace('VALUES ?', `VALUES (${rows[0].map(() => '?').join(',')})`) : sql;
      }
      let lastId = null, changes = 0;
      dbInstance.exec('BEGIN');
      try {
        for (const row of rows) {
          const r = dbInstance.prepare(insertSql).run(...row);
          lastId = r.lastInsertRowid;
          changes += r.changes;
        }
        dbInstance.exec('COMMIT');
      } catch (e) {
        dbInstance.exec('ROLLBACK');
        throw e;
      }
      return [{ affectedRows: changes, insertId: lastId }];
    }

    try {
      const stmt = dbInstance.prepare(sql);
      const result = stmt.run(...(params || []));
      return [{ affectedRows: result.changes, insertId: result.lastInsertRowid }];
    } catch (err) {
      console.error('SQL error:', sql, err.message, params);
      throw err;
    }
  };
}

const pool = {
  query: makeQuery(db),
  getConnection() { return new TxConnection(db); }
};

function initSchema() {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  if (tables.includes('admins')) return false;

  db.exec(`
    CREATE TABLE admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('super_admin','admin','manager')),
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      address TEXT,
      date_of_birth TEXT,
      profile_pic TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE buses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_number TEXT NOT NULL UNIQUE,
      plate_number TEXT NOT NULL UNIQUE,
      bus_type TEXT NOT NULL DEFAULT 'standard' CHECK(bus_type IN ('standard','luxury','sleeper','ac','non_ac')),
      capacity INTEGER NOT NULL,
      seat_layout TEXT DEFAULT '2x2',
      amenities TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      license_number TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      assigned_bus_id INTEGER REFERENCES buses(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      distance_km REAL,
      duration_minutes INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL REFERENCES routes(id),
      bus_id INTEGER NOT NULL REFERENCES buses(id),
      driver_id INTEGER REFERENCES drivers(id),
      departure_time TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      base_price REAL NOT NULL,
      operating_days TEXT DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL REFERENCES schedules(id),
      travel_date TEXT NOT NULL,
      seat_number TEXT NOT NULL,
      seat_row INTEGER NOT NULL,
      seat_column INTEGER NOT NULL,
      seat_type TEXT DEFAULT 'aisle' CHECK(seat_type IN ('window','aisle','middle')),
      is_booked INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_reference TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      schedule_id INTEGER NOT NULL REFERENCES schedules(id),
      travel_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','completed','refunded')),
      passenger_count INTEGER NOT NULL,
      contact_phone TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      special_requests TEXT,
      booking_date TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE booking_passengers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      seat_id INTEGER NOT NULL REFERENCES seats(id),
      full_name TEXT NOT NULL,
      age INTEGER,
      gender TEXT CHECK(gender IN ('male','female','other')),
      id_proof_type TEXT,
      id_proof_number TEXT
    );

    CREATE TABLE payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      transaction_id TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'credit_card' CHECK(payment_method IN ('credit_card','debit_card','upi','net_banking','wallet','cash','ecocash','onemoney','zimswitch','cash_on_departure')),
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending','success','failed','refunded','completed')),
      gateway_response TEXT,
      payment_date TEXT NOT NULL DEFAULT (datetime('now')),
      refund_date TEXT
    );

    CREATE TABLE tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      ticket_number TEXT NOT NULL UNIQUE,
      passenger_id INTEGER REFERENCES booking_passengers(id),
      seat_number TEXT NOT NULL,
      qr_code TEXT,
      issued_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      bus_id INTEGER NOT NULL REFERENCES buses(id),
      booking_id INTEGER REFERENCES bookings(id),
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      is_approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return true;
}

async function seedAdmin() {
  const bcrypt = require('bcryptjs');
  const existing = db.prepare("SELECT id FROM admins WHERE username = 'admin'").get();
  const hash = await bcrypt.hash('1234', 12);
  if (existing) {
    db.prepare("UPDATE admins SET email = ?, password_hash = ?, full_name = ? WHERE id = ?").run('ruvmudzingwa@gmail.com', hash, 'Super Admin', existing.id);
    console.log('Admin updated: ruvmudzingwa@gmail.com / 1234');
  } else {
    db.prepare("INSERT INTO admins (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)").run('admin', 'ruvmudzingwa@gmail.com', hash, 'Super Admin', 'super_admin');
    console.log('Admin created: ruvmudzingwa@gmail.com / 1234');
  }
}

function seedData() {
  const busCount = db.prepare("SELECT COUNT(*) AS c FROM buses").get().c;
  if (busCount > 0) return;
  console.log('Seeding sample data...');

  const CITIES = ['Harare','Bulawayo','Mutare','Victoria Falls','Masvingo','Gweru','Kwekwe','Kadoma','Chinhoyi','Beitbridge','Hwange','Bindura','Chegutu','Rusape','Chipinge','Zvishavane','Gwanda','Lupane','Plumtree','Kariba','Norton','Epworth','Ruwa','Redcliff','Gokwe','Mvurwi','Shamva','Murewa','Chiredzi','Triangle','Nyanga','Karoi','Makuti','Marondera','Chitungwiza','West Nicholson','Esigodini'];
  const SURNAMES = ['Moyo','Ncube','Dube','Sibanda','Ndlovu','Tshuma','Mpofu','Nyoni','Maphosa','Ngwenya','Mkandla','Nkomo','Sithole','Chamisa','Makoni','Chikwanha','Muzenda','Marufu','Zvobgo','Mhere','Chikomo','Madzima','Gumbo','Bvute','Nyambe'];
  const GIVEN_M = ['Tatenda','Tafadzwa','Kudakwashe','Simbarashe','Takunda','Tanaka','Tino','Takudzwa','Nyasha','Kudzai','Ronald','Blessing','Knowledge','Tendai','Tanatswa'];
  const GIVEN_F = ['Nomsa','Rumbidzai','Chipo','Vimbai','Nyaradzo','Sibongile','Rudo','Chiedza','Tariro','Makanaka','Tanyaradzwa','Hilda','Shamiso','Vongai','Rutendo'];
  const AMENITIES = [['AC','WiFi','USB Charging','Hot Meals','Entertainment','Legroom','Reading Light'],['AC','WiFi','USB Charging','Reading Light','Water','Snacks'],['Reading Light','Luggage Rack','Fan'],['AC','WiFi','Sleeper Berth','Curtains','USB Charging','Snacks','Coffee','Blanket'],['AC','WiFi','USB Charging','Water','Reading Light','Entertainment'],['AC','WiFi','Full Meals','Entertainment','USB Charging','Legroom']];

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[rand(0, arr.length - 1)]; }

  const busTypes = ['luxury','ac','standard','sleeper'];
  const busInsert = db.prepare("INSERT INTO buses (bus_number, plate_number, bus_type, capacity, seat_layout, amenities) VALUES (?, ?, ?, ?, ?, ?)");
  const prefixes = ['AAC','AAD','AAE','AAF','AAG','AAH','AAJ','AAK','AAL','AAM','AAN','AAP','AAQ','AAR','AAS','AAT','AAU','AAV','AAW','AAX','AAY','AAZ'];
  const usedPlates = new Set();
  for (let i = 1; i <= 6; i++) {
    const prefix = pick(prefixes);
    const num = rand(1000,9999);
    const plate = prefix + ' ' + num;
    if (usedPlates.has(plate)) continue;
    usedPlates.add(plate);
    const type = busTypes[i % 4];
    const cap = type === 'sleeper' ? 24 : type === 'luxury' ? 36 : type === 'ac' ? 44 : 50;
    busInsert.run('CAG-' + String(i).padStart(3,'0'), plate, type, cap, '2x2', JSON.stringify(pick(AMENITIES)));
  }

  const routePairs = ['Harare-Bulawayo-439-330','Harare-Mutare-263-210','Harare-Masvingo-292-210','Harare-Gweru-275-195','Harare-Chinhoyi-116-90','Harare-Victoria Falls-714-540','Harare-Beitbridge-580-420','Harare-Kariba-365-270','Harare-Kwekwe-209-150','Harare-Kadoma-142-105','Bulawayo-Harare-439-330','Bulawayo-Victoria Falls-283-210','Bulawayo-Gweru-162-120','Bulawayo-Masvingo-290-210','Bulawayo-Mutare-535-390','Mutare-Harare-263-210','Mutare-Chipinge-181-150','Mutare-Rusape-58-45','Mutare-Nyanga-102-90','Masvingo-Beitbridge-287-210','Masvingo-Chiredzi-157-130','Gweru-Kwekwe-62-50','Gweru-Zvishavane-107-85','Victoria Falls-Hwange-101-80'];
  const routeInsert = db.prepare("INSERT INTO routes (origin, destination, distance_km, duration_minutes) VALUES (?, ?, ?, ?)");
  for (const r of routePairs) {
    const [o,d,dist,dur] = r.split('-');
    routeInsert.run(o, d, parseInt(dist), parseInt(dur));
  }

  const drvInsert = db.prepare("INSERT INTO drivers (full_name, license_number, phone, email, address) VALUES (?, ?, ?, ?, ?)");
  const drvNames = ['Tafadzwa Moyo','Sibongile Ndlovu','Kudzai Chikomo','Tino Madzima','Rudo Sithole','Tanaka Gumbo','Chipo Dube','Simba Makoni','Nyaradzo Bvute','Tendai Nyambe'];
  for (let i = 0; i < drvNames.length; i++) {
    drvInsert.run(drvNames[i], 'DL-' + String(i+1).padStart(3,'0') + '-2024', '+263 77 ' + rand(100,999) + ' ' + rand(1000,9999), drvNames[i].toLowerCase().replace(/\s/g,'.') + '@cagbus.co.zw', pick(CITIES));
  }

  const bcrypt = require('bcryptjs');
  const uHash = bcrypt.hashSync('password123', 12);
  const uInsert = db.prepare("INSERT INTO users (full_name, email, phone, password_hash, address, date_of_birth) VALUES (?, ?, ?, ?, ?, ?)");
  uInsert.run('Tatenda Moyo','tatenda@example.co.zw','+263 77 100 0001',uHash,'123 Samora Machel Ave, Harare','1990-03-15');
  uInsert.run('Nomsa Ncube','nomsa@example.co.zw','+263 77 200 0002',uHash,'45 Main Street, Bulawayo','1988-07-22');
  uInsert.run('Takunda Chikwanha','takunda@example.co.zw','+263 78 300 0003',uHash,'78 Mutasa Road, Mutare','1995-11-08');
  uInsert.run('Rumbidzai Sithole','rumbi@example.co.zw','+263 77 400 0004',uHash,'12 Roberts Street, Gweru','1992-05-30');
  uInsert.run('Kudakwashe Mhere','kuda@example.co.zw','+263 78 500 0005',uHash,'56 Main Road, Masvingo','1985-09-12');

  console.log('Sample data seeded: buses, routes, drivers, users');
}

const isNew = initSchema();
seedAdmin().then(() => {
  if (isNew) seedData();
});

module.exports = pool;
