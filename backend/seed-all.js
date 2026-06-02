const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

const CITIES = [
  'Harare','Bulawayo','Mutare','Victoria Falls','Masvingo','Gweru','Kwekwe','Kadoma',
  'Chinhoyi','Beitbridge','Hwange','Bindura','Chegutu','Rusape','Chipinge','Zvishavane',
  'Gwanda','Lupane','Plumtree','Kariba','Norton','Epworth','Ruwa','Redcliff','Gokwe',
  'Mvurwi','Shamva','Murewa','Chiredzi','Triangle','Nyanga','Karoi','Makuti','Marondera',
  'Chitungwiza','West Nicholson','Esigodini'
];

const GIVEN_NAMES_M = [
  'Tatenda','Tafadzwa','Kudakwashe','Simbarashe','Takunda','Tanaka','Tino','Takudzwa',
  'Nyasha','Kudzai','Ronald','Blessing','Knowledge','Tendai','Tanatswa','Anesu','Tawanda',
  'Munashe','Brandon','Tadiwa','Tinaye','Kumbirai','Ruvimbo'
];

const GIVEN_NAMES_F = [
  'Nomsa','Rumbidzai','Chipo','Vimbai','Nyaradzo','Sibongile','Rudo','Chiedza','Tariro',
  'Makanaka','Tanyaradzwa','Hilda','Shamiso','Vongai','Rutendo','Tendai','Tsitsi','Anopa',
  'Tadiwanashe','Kudzai','Nokutenda','Mufaro','Sarah','Priscilla','Grace'
];

const SURNAMES = [
  'Moyo','Ncube','Dube','Sibanda','Ndlovu','Tshuma','Mpofu','Nyoni','Maphosa','Ngwenya',
  'Mkandla','Nkomo','Sithole','Chamisa','Makoni','Chikwanha','Muzenda','Marufu','Zvobgo',
  'Mhere','Chikomo','Madzima','Gumbo','Bvute','Nyambe','Murambwi','Magaisa','Chikore',
  'Mangena','Mlambo','Gono','Chigumba','Kativhu','Mangwiro','Chikanda','Chauke','Muleya'
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function pickN(arr, n) { const s = [...arr].sort(() => Math.random() - 0.5); return s.slice(0, Math.min(n, s.length)); }

function generatePhone() {
  const prefixes = ['77','78','71','73','76'];
  return `+263 ${pick(prefixes)} ${rand(100, 999)} ${rand(1000, 9999)}`;
}

const REVIEW_TEXTS = [
  'Great service, comfortable bus and on time!','The WiFi was excellent, will definitely book again.',
  'Driver was professional and courteous.','Bus was clean and well maintained. Good value for money.',
  'On-time departure and arrival. Very satisfied.','The legroom was amazing on the luxury bus.',
  'Affordable and reliable. CAG Bus is the best in Zim.','Sleeper bus was very comfortable for overnight trip.',
  'Best bus service in Zimbabwe! Highly recommended.','The USB charging ports were a lifesaver.',
  'Smooth journey, friendly driver. Will use again.','Booking was easy and payment was seamless.',
  'Comfortable seats and plenty of luggage space.','Punctual and professional. Great experience.',
  'EcoCash payment was super convenient.','Smooth ride even on the rough roads.',
  'Excellent value, especially the luxury class.','Staff at the terminal were helpful.'
];

const ROUTE_PAIRS = [
  ['Harare','Bulawayo',439,330],['Harare','Mutare',263,210],['Harare','Masvingo',292,210],
  ['Harare','Gweru',275,195],['Harare','Chinhoyi',116,90],['Harare','Victoria Falls',714,540],
  ['Harare','Beitbridge',580,420],['Harare','Kariba',365,270],['Harare','Hwange',641,480],
  ['Harare','Kwekwe',209,150],['Harare','Kadoma',142,105],['Harare','Marondera',72,60],
  ['Harare','Bindura',88,75],['Harare','Chegutu',103,80],['Harare','Norton',40,35],
  ['Harare','Ruwa',22,20],['Harare','Chitungwiza',25,25],['Harare','Epworth',15,15],
  ['Harare','Murewa',96,80],['Harare','Shamva',108,85],['Harare','Mvurwi',120,95],
  ['Harare','Rusape',167,130],['Harare','Chipinge',440,330],['Harare','Zvishavane',382,270],
  ['Harare','Gokwe',305,240],['Harare','Karoi',185,150],['Harare','Nyanga',332,255],
  ['Harare','Chiredzi',460,360],['Harare','Redcliff',221,160],['Harare','Gwanda',568,420],
  ['Harare','Plumtree',541,400],['Bulawayo','Victoria Falls',283,210],
  ['Bulawayo','Harare',439,330],['Bulawayo','Beitbridge',323,240],
  ['Bulawayo','Gwanda',129,105],['Bulawayo','Plumtree',102,80],
  ['Bulawayo','Hwange',203,150],['Bulawayo','Lupane',169,130],
  ['Bulawayo','Gweru',162,120],['Bulawayo','Masvingo',290,210],
  ['Bulawayo','Mutare',535,390],['Bulawayo','Esigodini',36,30],
  ['Bulawayo','Kwekwe',224,165],['Bulawayo','Zvishavane',270,200],
  ['Bulawayo','Chinhoyi',417,310],['Mutare','Harare',263,210],
  ['Mutare','Chipinge',181,150],['Mutare','Rusape',58,45],
  ['Mutare','Nyanga',102,90],['Mutare','Chiredzi',304,240],
  ['Mutare','Masvingo',258,195],['Mutare','Bulawayo',535,390],
  ['Mutare','Marondera',191,150],['Mutare','Triangle',317,250],
  ['Gweru','Harare',275,195],['Gweru','Bulawayo',162,120],
  ['Gweru','Kwekwe',62,50],['Gweru','Kadoma',133,100],
  ['Gweru','Masvingo',180,140],['Gweru','Zvishavane',107,85],
  ['Gweru','Gokwe',156,130],['Gweru','Redcliff',50,40],
  ['Masvingo','Harare',292,210],['Masvingo','Beitbridge',287,210],
  ['Masvingo','Mutare',258,195],['Masvingo','Gweru',180,140],
  ['Masvingo','Chiredzi',157,130],['Masvingo','Zvishavane',85,70],
  ['Masvingo','Bulawayo',290,210],['Masvingo','Triangle',138,110],
  ['Victoria Falls','Bulawayo',283,210],['Victoria Falls','Harare',714,540],
  ['Victoria Falls','Hwange',101,80],['Victoria Falls','Kariba',268,240],
  ['Beitbridge','Harare',580,420],['Beitbridge','Bulawayo',323,240],
  ['Beitbridge','Masvingo',287,210],['Beitbridge','Gwanda',194,150],
  ['Chinhoyi','Harare',116,90],['Chinhoyi','Karoi',69,55],
  ['Chinhoyi','Kariba',249,195],['Chinhoyi','Mvurwi',68,55],
  ['Kariba','Harare',365,270],['Kariba','Victoria Falls',268,240],
  ['Nyanga','Mutare',102,90],['Nyanga','Harare',332,255],
  ['Chipinge','Mutare',181,150],['Chipinge','Chiredzi',157,130],
  ['Hwange','Victoria Falls',101,80],['Hwange','Bulawayo',203,150],
  ['Marondera','Rusape',89,70],['Marondera','Harare',72,60],
  ['Kadoma','Chegutu',39,30],['Kadoma','Harare',142,105],
  ['Kwekwe','Redcliff',12,10],['Kwekwe','Harare',209,150],
  ['Gwanda','West Nicholson',63,50],['Gwanda','Bulawayo',129,105],
  ['Rusape','Mutare',58,45],['Rusape','Marondera',89,70],
  ['Zvishavane','Masvingo',85,70],['Zvishavane','Gweru',107,85],
  ['Bindura','Harare',88,75],['Bindura','Shamva',30,25],
  ['Chegutu','Harare',103,80],['Chiredzi','Masvingo',157,130],
  ['Triangle','Masvingo',138,110],['Karoi','Chinhoyi',69,55],
  ['Mvurwi','Bindura',52,40],['Mvurwi','Harare',120,95],
  ['Shamva','Bindura',30,25],['Norton','Harare',40,35],
  ['Epworth','Harare',15,15],['Ruwa','Harare',22,20],
  ['Plumtree','Bulawayo',102,80],['Lupane','Bulawayo',169,130],
  ['Gokwe','Gweru',156,130],['Redcliff','Gweru',50,40],
  ['Kariba','Makuti',128,110],['Makuti','Karoi',41,35]
];

function priceByDist(dist) {
  if (dist <= 50) return 5 + rand(0,3);
  if (dist <= 100) return 8 + rand(0,4);
  if (dist <= 150) return 12 + rand(0,5);
  if (dist <= 200) return 16 + rand(0,5);
  if (dist <= 300) return 22 + rand(0,6);
  if (dist <= 400) return 28 + rand(0,7);
  if (dist <= 500) return 35 + rand(0,8);
  if (dist <= 700) return 50 + rand(0,10);
  return 60 + rand(0,10);
}

const TIMES = ['05:00','06:00','06:30','07:00','07:30','08:00','08:30','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
const DAY_COMBOS = ['mon,tue,wed,thu,fri,sat,sun','mon,tue,wed,thu,fri','mon,wed,fri,sun','tue,thu,sat','mon,wed,fri','sat,sun','tue,thu,sat,sun'];
const BUS_TYPES = ['luxury','ac','standard','sleeper'];
const AMENITY_SETS = [
  ['AC','WiFi','USB Charging','Hot Meals','Entertainment','Legroom','Reading Light'],
  ['AC','WiFi','USB Charging','Reading Light','Water','Snacks'],
  ['Reading Light','Luggage Rack','Fan'],
  ['AC','WiFi','Sleeper Berth','Curtains','USB Charging','Snacks','Coffee','Blanket'],
  ['AC','WiFi','USB Charging','Water','Reading Light','Entertainment'],
  ['AC','WiFi','Full Meals','Entertainment','USB Charging','Legroom'],
  ['AC','Sleeper Berth','Curtains','Reading Light','Charging','Blanket'],
  ['AC','WiFi','USB Charging','Hot Meals','Entertainment','Legroom','Reading Light','Water'],
  ['AC','WiFi','Reading Light','Water','Luggage Rack'],
  ['Fan','Reading Light','Luggage Rack','Water']
];

async function seedAll() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cag_bus_booking',
    multipleStatements: true
  });

  console.log('=== CAG Bus Booking - Full Population ===\n');

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('TRUNCATE TABLE reviews');
  await conn.query('TRUNCATE TABLE tickets');
  await conn.query('TRUNCATE TABLE booking_passengers');
  await conn.query('TRUNCATE TABLE payments');
  await conn.query('TRUNCATE TABLE bookings');
  await conn.query('TRUNCATE TABLE seats');
  await conn.query('TRUNCATE TABLE schedules');
  await conn.query('TRUNCATE TABLE drivers');
  await conn.query('TRUNCATE TABLE routes');
  await conn.query('TRUNCATE TABLE buses');
  await conn.query('TRUNCATE TABLE admins');
  await conn.query('TRUNCATE TABLE users');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  // ============ ADMINS ============
  const aHash = await bcrypt.hash('admin123', 12);
  await conn.query(
    'INSERT INTO admins (username, email, password_hash, full_name, role) VALUES ?',
    [[
      ['admin','admin@cagbus.co.zw',aHash,'Tendai Mukaro','super_admin'],
      ['manager','manager@cagbus.co.zw',aHash,'Chiedza Dube','manager'],
      ['ops','ops@cagbus.co.zw',aHash,'Tafadzwa Sibanda','admin'],
      ['finance','finance@cagbus.co.zw',aHash,'Rumbidzai Moyo','admin'],
      ['support','support@cagbus.co.zw',aHash,'Tanaka Gumbo','admin'],
    ]]
  );
  console.log('admins: 5');

  // ============ BUSES ============
  const busData = [];
  const plates = new Set();
  for (let i = 1; i <= 40; i++) {
    const prefix = pick(['AAC','AAD','AAE','AAF','AAG','AAH','AAJ','AAK','AAL','AAM','AAN','AAP','AAQ','AAR','AAS','AAT','AAU','AAV','AAW','AAX','AAY','AAZ']);
    let num;
    do { num = rand(1000, 9999); } while (plates.has(`${prefix} ${num}`));
    plates.add(`${prefix} ${num}`);
    const type = BUS_TYPES[i % BUS_TYPES.length];
    let cap;
    switch(type) {
      case 'luxury': cap = 36; break;
      case 'sleeper': cap = 24; break;
      case 'ac': cap = 44; break;
      default: cap = 50;
    }
    busData.push([`CAG-${String(i).padStart(3,'0')}`, `${prefix} ${num}`, type, cap, '2x2', JSON.stringify(pick(AMENITY_SETS))]);
  }
  await conn.query('INSERT INTO buses (bus_number, plate_number, bus_type, capacity, seat_layout, amenities) VALUES ?', [busData]);
  console.log('buses: 40');

  // ============ ROUTES ============
  const rSet = new Set();
  const routeData = [];
  for (const [o,d,dist,dur] of ROUTE_PAIRS) {
    const key = `${o}-${d}`;
    if (rSet.has(key)) continue;
    rSet.add(key);
    routeData.push([o, d, dist, dur]);
  }
  await conn.query('INSERT INTO routes (origin, destination, distance_km, duration_minutes) VALUES ?', [routeData]);
  console.log(`routes: ${routeData.length}`);

  // ============ DRIVERS ============
  const dNames = [
    'Tafadzwa Moyo','Sibongile Ndlovu','Kudzai Chikomo','Tino Madzima','Rudo Sithole',
    'Tanaka Gumbo','Chipo Dube','Simba Makoni','Nyaradzo Bvute','Tendai Nyambe',
    'Munashe Dube','Tariro Sibanda','Kumbirai Mpofu','Shamiso Tshuma','Ronald Ncube',
    'Anesu Maphosa','Tsitsi Ngwenya','Tadiwa Nkomo','Vongai Sithole','Rutendo Makoni',
    'Tawanda Chamisa','Ruvimbo Chikwanha','Brandon Muzenda','Tinaye Marufu','Makanaka Zvobgo',
    'Priscilla Mhere','Blessing Chikomo','Grace Madzima','Hilda Gumbo','Sarah Bvute',
    'Knowledge Murambwi','Nokutenda Magaisa','Tanatswa Chikore','Mufaro Mangena',
    'Anopa Mlambo','Tadiwanashe Gono','Munashe Kativhu','Tanyaradzwa Chikanda',
    'Kudzai Mangwiro','Tendai Chauke'
  ];
  const drvData = dNames.map((n, i) => {
    const em = n.toLowerCase().replace(/\s+/g,'.') + '@cagbus.co.zw';
    return [n, `DL-${String(i+1).padStart(3,'0')}-2024`, generatePhone(), em, pick(CITIES)];
  });
  await conn.query('INSERT INTO drivers (full_name, license_number, phone, email, address) VALUES ?', [drvData]);
  console.log(`drivers: ${drvData.length}`);

  // ============ USERS ============
  const uHash = await bcrypt.hash('password123', 12);
  const users = [
    ['Tatenda Moyo','tatenda@example.co.zw','+263 77 100 0001',uHash,'123 Samora Machel Ave, Harare','1990-03-15'],
    ['Nomsa Ncube','nomsa@example.co.zw','+263 77 200 0002',uHash,'45 Main Street, Bulawayo','1988-07-22'],
    ['Takunda Chikwanha','takunda@example.co.zw','+263 78 300 0003',uHash,'78 Mutasa Road, Mutare','1995-11-08'],
    ['Rumbidzai Sithole','rumbi@example.co.zw','+263 77 400 0004',uHash,'12 Roberts Street, Gweru','1992-05-30'],
    ['Kudakwashe Mhere','kuda@example.co.zw','+263 78 500 0005',uHash,'56 Main Road, Masvingo','1985-09-12'],
    ['Chipo Muzenda','chipo@example.co.zw','+263 77 600 0006',uHash,'89 Livingstone Way, Victoria Falls','1998-01-25'],
    ['Tafadzwa Makoni','tafa@example.co.zw','+263 78 700 0007',uHash,'34 Cecil Ave, Chinhoyi','1993-12-03'],
    ['Nyasha Zvobgo','nyasha@example.co.zw','+263 77 800 0008',uHash,'67 Lundi Road, Beitbridge','1991-08-19'],
    ['Simbarashe Dube','simba@example.co.zw','+263 78 900 0009',uHash,'23 Main Street, Kwekwe','1987-04-14'],
    ['Vimbai Marufu','vimbai@example.co.zw','+263 77 000 0010',uHash,'90 Harare Drive, Kadoma','1996-06-28'],
  ];
  const usedEmails = new Set(users.map(u=>u[1]));
  for (let i = 0; i < 30; i++) {
    const g = pick(['M','F']);
    const fn = g === 'M' ? pick(GIVEN_NAMES_M) : pick(GIVEN_NAMES_F);
    const sn = pick(SURNAMES);
    let em;
    do { em = `${fn.toLowerCase()}.${sn.toLowerCase()}${rand(1,99)}@example.co.zw`; } while (usedEmails.has(em));
    usedEmails.add(em);
    const city = pick(CITIES);
    users.push([`${fn} ${sn}`, em, generatePhone(), uHash, `${rand(1,999)} ${pick(['Samora Machel','Main','Robert Mugabe','Cecil','Livingstone','Mutasa','Lundi','Harare','Josiah Tongogara','Chinhoyi','Fort','Selous','Fife','Gweru','Leopold Takawira'])}, ${city}`, `19${rand(70,99)}-${String(rand(1,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`]);
  }
  await conn.query('INSERT INTO users (full_name, email, phone, password_hash, address, date_of_birth) VALUES ?', [users]);
  console.log(`customers: ${users.length}`);

  // ============ SCHEDULES ============
  const schedData = [];
  for (let rid = 1; rid <= routeData.length; rid++) {
    const dist = routeData[rid-1][2];
    const base = priceByDist(dist);
    const num = rand(1, 3);
    for (let s = 0; s < num; s++) {
      const busId = rand(1, busData.length);
      const drvId = rand(1, drvData.length);
      const dep = pick(TIMES);
      const durH = Math.ceil(routeData[rid-1][3] / 60);
      const [dh, dm] = dep.split(':').map(Number);
      let ah = dh + durH, am = dm;
      if (ah >= 24) ah -= 24;
      const arr = `${String(ah).padStart(2,'0')}:${String(am).padStart(2,'0')}`;
      schedData.push([rid, busId, drvId, dep+':00', arr+':00', base + rand(-3,5), pick(DAY_COMBOS)]);
    }
  }
  await conn.query('INSERT INTO schedules (route_id, bus_id, driver_id, departure_time, arrival_time, base_price, operating_days) VALUES ?', [schedData]);
  console.log(`schedules: ${schedData.length}`);

  // ============ SEATS ============
  const seatData = [];
  const travelDates = [];
  for (let d = 1; d <= 30; d++) {
    travelDates.push(`2026-06-${String(d).padStart(2,'0')}`);
  }
  // Only generate seats for first 80 schedules (manageable)
  const MAX_SCHED_FOR_SEATS = Math.min(80, schedData.length);
  for (let si = 0; si < MAX_SCHED_FOR_SEATS; si++) {
    const sched = schedData[si];
    const busId = sched[1];
    const bus = busData[busId - 1];
    const cap = bus[3];
    const price = sched[5];
    const cols = cap > 40 ? 5 : (cap > 36 ? 4 : 3);
    const rows = Math.ceil(cap / cols);
    // generate for 20 travel dates
    for (let di = 0; di < 20; di++) {
      const date = travelDates[di];
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const seatNum = `${r}${String.fromCharCode(64 + c)}`;
          const st = c <= 2 ? (c === 1 || (cols > 3 && c === 2) ? 'aisle' : 'middle') : (c === cols ? 'window' : 'aisle');
          const seatType = c === 1 || c === cols ? 'window' : (c === Math.ceil(cols/2) ? 'aisle' : 'middle');
          seatData.push([si + 1, date, seatNum, r, c, seatType, 0, price]);
        }
      }
    }
  }
  for (let i = 0; i < seatData.length; i += 500) {
    await conn.query('INSERT INTO seats (schedule_id, travel_date, seat_number, seat_row, seat_column, seat_type, is_booked, price) VALUES ?', [seatData.slice(i, i + 500)]);
  }
  console.log(`seats: ${seatData.length}`);

  // ============ BOOKINGS ============
  const BOOK_STATUS = ['pending','confirmed','completed','cancelled'];
  const bData = [];
  for (let i = 0; i < 60; i++) {
    const uid = rand(1, users.length);
    const schedId = rand(1, MAX_SCHED_FOR_SEATS);
    const sched = schedData[schedId - 1];
    const route = routeData[sched[0] - 1];
    const price = sched[5];
    const pax = rand(1, 4);
    const total = +(price * pax).toFixed(2);
    const tax = +(total * 0.05).toFixed(2);
    const final = +(total + tax).toFixed(2);
    const status = pick(BOOK_STATUS);
    const td = travelDates[rand(0, 19)];
    const ref = `CAG${String(i+1).padStart(6,'0')}`;
    const phone = generatePhone();
    const email = users[uid-1][1];
    bData.push([ref, uid, schedId, td, total, 0, tax, final, status, pax, phone, email, '']);
  }
  await conn.query('INSERT INTO bookings (booking_reference, user_id, schedule_id, travel_date, total_amount, discount_amount, tax_amount, final_amount, status, passenger_count, contact_phone, contact_email, special_requests) VALUES ?', [bData]);

  // Fetch booking IDs
  const [insertedBookings] = await conn.query('SELECT id, booking_reference FROM bookings ORDER BY id');
  console.log(`bookings: ${bData.length}`);

  // ============ BOOKING PASSENGERS ============
  const bpData = [];
  const seatMap = {};
  const seatRows = await conn.query('SELECT id, schedule_id, travel_date, seat_number, is_booked FROM seats WHERE is_booked = 0 LIMIT 500');
  let seatIdx = 0;
  for (const bk of insertedBookings) {
    const bkIdx = bk.id - 1;
    const pax = bData[bkIdx][9];
    for (let p = 0; p < pax && seatIdx < seatRows[0].length; p++) {
      const seat = seatRows[0][seatIdx];
      seatIdx++;
      const fn = pick(GIVEN_NAMES_M) + ' ' + pick(SURNAMES);
      const age = rand(5, 80);
      const gen = pick(['male','female']);
      bpData.push([bk.id, seat.id, fn, age, gen, pick(['national_id','passport','drivers_license']), `ID-${rand(100000,999999)}`]);
    }
  }
  if (bpData.length) {
    await conn.query('INSERT INTO booking_passengers (booking_id, seat_id, full_name, age, gender, id_proof_type, id_proof_number) VALUES ?', [bpData]);
  }
  // Mark those seats as booked
  console.log(`passengers: ${bpData.length}`);

  // Mark seats as booked
  for (const bp of bpData) {
    await conn.query('UPDATE seats SET is_booked = 1 WHERE id = ?', [bp[1]]);
  }

  // ============ PAYMENTS ============
  const payMethods = ['ecocash','onemoney','zimswitch','cash_on_departure'];
  const payStatuses = ['pending','success','failed','refunded'];
  const pData = [];
  for (const bk of insertedBookings) {
    const bkIdx = bk.id - 1;
    const status = bData[bkIdx][8];
    if (status === 'cancelled' && Math.random() < 0.7) continue;
    if (Math.random() < 0.15) continue;
    const method = pick(payMethods);
    let pStatus;
    if (status === 'cancelled') pStatus = 'refunded';
    else if (status === 'pending') pStatus = 'pending';
    else if (status === 'completed') pStatus = 'success';
    else pStatus = Math.random() < 0.85 ? 'success' : 'failed';
    const tid = `TXN-${String(rand(100000,999999))}`;
    const amount = bData[bkIdx][7];
    pData.push([bk.id, tid, amount, method, pStatus, JSON.stringify({tid,status:pStatus,simulated:true})]);
  }
  if (pData.length) {
    await conn.query('INSERT INTO payments (booking_id, transaction_id, amount, payment_method, payment_status, gateway_response) VALUES ?', [pData]);
  }
  console.log(`payments: ${pData.length}`);

  // ============ TICKETS ============
  const tData = [];
  let ticketNum = 1;
  for (const bp of bpData) {
    const bkId = bp[0];
    const seatId = bp[1];
    const seatRow = (await conn.query('SELECT seat_number, schedule_id FROM seats WHERE id = ?', [seatId]))[0][0];
    if (!seatRow) continue;
    const bk = insertedBookings.find(b => b.id === bkId);
    if (!bk) continue;
    const tktNum = `TKT-${String(ticketNum).padStart(6,'0')}`;
    ticketNum++;
    const qr = JSON.stringify({ticket:tktNum,booking:bk.booking_reference,seat:seatRow.seat_number});
    tData.push([bkId, tktNum, null, seatRow.seat_number, qr]);
  }
  if (tData.length) {
    for (let i = 0; i < tData.length; i += 100) {
      await conn.query('INSERT INTO tickets (booking_id, ticket_number, passenger_id, seat_number, qr_code) VALUES ?', [tData.slice(i, i + 100)]);
    }
  }
  console.log(`tickets: ${tData.length}`);

  // ============ REVIEWS ============
  const rvData = [];
  const rateDist = [1,2,3,4,4,5,5,5,5,5];
  for (let i = 0; i < Math.min(insertedBookings.length, 40); i++) {
    const bk = insertedBookings[i];
    const bkStatus = bData[bk.id-1][8];
    if (bkStatus === 'cancelled' || bkStatus === 'pending') continue;
    const bkIdx = bk.id - 1;
    const sched = schedData[bData[bkIdx][2] - 1];
    const busId = sched[1];
    rvData.push([bData[bkIdx][1], busId, bk.id, pick(rateDist), pick(REVIEW_TEXTS), 1]);
  }
  if (rvData.length) {
    await conn.query('INSERT INTO reviews (user_id, bus_id, booking_id, rating, comment, is_approved) VALUES ?', [rvData]);
  }
  console.log(`reviews: ${rvData.length}`);

  console.log('\n=== POPULATION COMPLETE ===');
  console.log(`Admins: 5 | Buses: ${busData.length} | Routes: ${routeData.length}`);
  console.log(`Drivers: ${drvData.length} | Customers: ${users.length} | Schedules: ${schedData.length}`);
  console.log(`Seats: ${seatData.length}`);
  console.log(`Bookings: ${bData.length} | Passengers: ${bpData.length}`);
  console.log(`Payments: ${pData.length} | Tickets: ${tData.length} | Reviews: ${rvData.length}`);
  console.log('\nAdmin: admin / admin123');
  console.log('Customer: tatenda@example.co.zw / password123');

  await conn.end();
  process.exit(0);
}

seedAll().catch(err => {
  console.error('Seed failed:', err.message);
  if (err.sql) console.error('SQL:', err.sql?.substring(0, 300));
  process.exit(1);
});


