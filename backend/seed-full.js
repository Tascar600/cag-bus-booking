const bcrypt = require('bcryptjs');

module.exports = async function populateFull(pool) {
  const [uCount] = await pool.query("SELECT COUNT(*) AS c FROM users");
  if (uCount[0].c > 10) { console.log('Already populated — skipping'); return; }

  console.log('=== POPULATING FULL DATABASE ===');

  const userData = [
    { name:'Tatenda Moyo', email:'tatenda@example.co.zw', phone:'+263 77 100 0001', addr:'123 Samora Machel Ave, Harare', dob:'1990-03-15' },
    { name:'Nomsa Ncube', email:'nomsa@example.co.zw', phone:'+263 77 200 0002', addr:'45 Main Street, Bulawayo', dob:'1988-07-22' },
    { name:'Takunda Chikwanha', email:'takunda@example.co.zw', phone:'+263 78 300 0003', addr:'78 Mutasa Road, Mutare', dob:'1995-11-08' },
    { name:'Rumbidzai Sithole', email:'rumbi@example.co.zw', phone:'+263 77 400 0004', addr:'12 Roberts Street, Gweru', dob:'1992-05-30' },
    { name:'Kudakwashe Mhere', email:'kuda@example.co.zw', phone:'+263 78 500 0005', addr:'56 Main Road, Masvingo', dob:'1985-09-12' },
    { name:'Tanaka Gumbo', email:'tanaka@example.co.zw', phone:'+263 77 600 0006', addr:'88 Nelson Mandela Ave, Harare', dob:'1993-01-25' },
    { name:'Sibongile Dube', email:'sibo@example.co.zw', phone:'+263 78 700 0007', addr:'22 10th Avenue, Bulawayo', dob:'1991-08-14' },
    { name:'Simbarashe Makoni', email:'simba@example.co.zw', phone:'+263 77 800 0008', addr:'7 Herbert Chitepo St, Mutare', dob:'1987-12-03' },
    { name:'Nyaradzo Bvute', email:'nyari@example.co.zw', phone:'+263 78 900 0009', addr:'34 Main Street, Gweru', dob:'1996-06-19' },
    { name:'Tafadzwa Moyo', email:'tafa@example.co.zw', phone:'+263 77 101 0010', addr:'15 Park Lane, Harare', dob:'1994-04-10' },
    { name:'Chipo Nyoni', email:'chipo@example.co.zw', phone:'+263 78 202 0011', addr:'90 Fort Street, Bulawayo', dob:'1989-10-28' },
    { name:'Knowledge Chamisa', email:'knowledge@example.co.zw', phone:'+263 77 303 0012', addr:'42 Mutare Road, Masvingo', dob:'1986-02-17' },
    { name:'Rudo Maphosa', email:'rudo@example.co.zw', phone:'+263 78 404 0013', addr:'19 Livingstone Ave, Victoria Falls', dob:'1997-09-05' },
    { name:'Tendai Ngwenya', email:'tendai@example.co.zw', phone:'+263 77 505 0014', addr:'66 Main Street, Kwekwe', dob:'1984-11-22' },
    { name:'Vimbai Tshuma', email:'vimbai@example.co.zw', phone:'+263 78 606 0015', addr:'8 Hwange Road, Hwange', dob:'1998-03-30' },
    { name:'Kudzai Madzima', email:'kudzai@example.co.zw', phone:'+263 77 707 0016', addr:'33 Chinhoyi Street, Chinhoyi', dob:'1990-07-07' },
    { name:'Tanatswa Zvobgo', email:'tanatswa@example.co.zw', phone:'+263 78 808 0017', addr:'21 Beitbridge Road, Beitbridge', dob:'1992-12-25' },
    { name:'Rutendo Gumbo', email:'rutendo@example.co.zw', phone:'+263 77 909 0018', addr:'55 Kariba Drive, Kariba', dob:'1995-05-15' },
    { name:'Makanaka Sithole', email:'makanaka@example.co.zw', phone:'+263 78 111 0019', addr:'12 Chipinge Road, Chipinge', dob:'1988-08-08' },
    { name:'Blessing Ndlovu', email:'blessing@example.co.zw', phone:'+263 77 222 0020', addr:'99 Nyanga Road, Nyanga', dob:'1991-01-01' },
  ];
  const uHash = bcrypt.hashSync('password123', 12);
  const [existingUsers] = await pool.query("SELECT email FROM users");
  const existingEmails = new Set(existingUsers.map(r => r.email));
  let created = 0;
  for (const u of userData) {
    if (existingEmails.has(u.email)) continue;
    await pool.query(
      'INSERT INTO users (full_name, email, phone, password_hash, address, date_of_birth) VALUES (?, ?, ?, ?, ?, ?)',
      [u.name, u.email, u.phone, uHash, u.addr, u.dob]
    );
    created++;
  }
  console.log(`✅ ${userData.length} customers`);

  const [allSchedules] = await pool.query("SELECT id, base_price FROM schedules WHERE is_active = 1");
  const [allUsers] = await pool.query("SELECT id FROM users");

  const statuses = ['confirmed','confirmed','confirmed','completed','completed','completed','cancelled','pending'];
  const methods = ['ecocash','onemoney','zimswitch','cash_on_departure'];

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[rand(0, arr.length - 1)]; }
  function rDate(daysAgo, daysAhead) {
    const d = new Date(); d.setDate(d.getDate() + rand(-daysAgo, daysAhead));
    return d.toISOString().split('T')[0];
  }

  let totalBookings = 0, totalPayments = 0, totalTickets = 0, totalReviews = 0;

  // Fetch all schedules with their bus info for seat generation
  const [scheduleBusInfo] = await pool.query(
    "SELECT s.id, s.base_price, s.departure_time, b.bus_type, b.capacity, b.id AS bus_id FROM schedules s JOIN buses b ON s.bus_id = b.id"
  );
  const busBySchedule = {};
  for (const s of scheduleBusInfo) busBySchedule[s.id] = s;

  // Generate seats for a schedule+date if not already present
  async function ensureSeats(scheduleId, travelDate) {
    const [existing] = await pool.query("SELECT COUNT(*) AS c FROM seats WHERE schedule_id = ? AND travel_date = ?", [scheduleId, travelDate]);
    if (existing[0].c > 0) return;
    const sched = busBySchedule[scheduleId];
    if (!sched) return;
    const busType = sched.bus_type;
    let cols;
    if (busType === 'sleeper') cols = 2;
    else if (busType === 'luxury') cols = 3;
    else if (busType === 'ac') cols = 4;
    else cols = 5;
    const rows = Math.ceil(sched.capacity / cols);
    const letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
    const seats = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const seatNum = r + letters[c - 1];
        let seatType = 'aisle';
        if (c === 1 || c === cols) seatType = 'window';
        else if (cols > 3) seatType = 'middle';
        seats.push([scheduleId, travelDate, seatNum, r, c, seatType, sched.base_price, 0]);
      }
    }
    for (const s of seats) {
      await pool.query(
        'INSERT INTO seats (schedule_id, travel_date, seat_number, seat_row, seat_column, seat_type, price, is_booked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        s
      );
    }
  }

  for (let bi = 0; bi < 35; bi++) {
    const schedule = pick(allSchedules);
    const user = pick(allUsers);
    const status = pick(statuses);
    const passCount = rand(1, 4);
    const total = +(schedule.base_price * passCount).toFixed(2);
    const tax = +(total * 0.05).toFixed(2);
    const finalAmt = +(total + tax).toFixed(2);
    const travelDate = status === 'completed' ? rDate(60, 0) : (status === 'cancelled' ? rDate(30, -1) : rDate(0, 30));
    const ref = 'CAG-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const phone = '+263 77 ' + rand(100, 999) + ' ' + rand(1000, 9999);
    const emails = ['tatenda@example.co.zw','nomsa@example.co.zw','takunda@example.co.zw','rumbi@example.co.zw','kuda@example.co.zw','tanaka@example.co.zw','sibo@example.co.zw','simba@example.co.zw','nyari@example.co.zw','tafa@example.co.zw','chipo@example.co.zw','knowledge@example.co.zw','rudo@example.co.zw','tendai@example.co.zw','vimbai@example.co.zw','kudzai@example.co.zw','tanatswa@example.co.zw','rutendo@example.co.zw','makanaka@example.co.zw','blessing@example.co.zw'];
    const contactEmail = emails[rand(0, 19)];

    await pool.query(
      "INSERT INTO bookings (booking_reference, user_id, schedule_id, travel_date, total_amount, tax_amount, final_amount, status, passenger_count, contact_phone, contact_email, booking_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
      [ref, user.id, schedule.id, travelDate, total, tax, finalAmt, status, passCount, phone, contactEmail]
    );
    const [bk] = await pool.query('SELECT id, booking_reference, schedule_id, travel_date, status FROM bookings WHERE booking_reference = ?', [ref]);
    const booking = bk[0];
    totalBookings++;

    // ─── GENERATE SEATS + BOOK + ADD PASSENGERS ──────────────────
    await ensureSeats(booking.schedule_id, booking.travel_date);
    const [availableSeats] = await pool.query(
      "SELECT id, seat_number FROM seats WHERE schedule_id = ? AND travel_date = ? AND is_booked = 0 LIMIT ?",
      [booking.schedule_id, booking.travel_date, passCount]
    );

    const firstNames = ['Tatenda','Nomsa','Takunda','Rumbidzai','Kudakwashe','Tanaka','Sibongile','Simbarashe','Nyaradzo','Tafadzwa','Chipo','Knowledge','Rudo','Tendai','Vimbai','Kudzai','Tanatswa','Rutendo','Makanaka','Blessing'];
    const lastNames = ['Moyo','Ncube','Dube','Sibanda','Ndlovu','Tshuma','Mpofu','Nyoni','Maphosa','Ngwenya','Mkandla','Nkomo','Sithole','Chamisa','Makoni','Chikwanha','Muzenda','Zvobgo','Mhere','Chikomo'];

    for (let pi = 0; pi < Math.min(passCount, availableSeats.length); pi++) {
      const seat = availableSeats[pi];
      const fn = pick(firstNames);
      const ln = pick(lastNames);
      const isFemale = ['a','e'].includes(fn.slice(-1)) || ['Nomsa','Chipo','Rudo','Vimbai','Rutendo'].includes(fn);
      await pool.query('UPDATE seats SET is_booked = 1 WHERE id = ?', [seat.id]);
      await pool.query(
        'INSERT INTO booking_passengers (booking_id, seat_id, full_name, age, gender, id_proof_type, id_proof_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [booking.id, seat.id, fn + ' ' + ln, rand(18, 65), isFemale ? 'female' : 'male', 'National ID', rand(100000, 999999) + ' ' + rand(10, 99)]
      );
      const [psg] = await pool.query("SELECT id FROM booking_passengers WHERE booking_id = ? AND seat_id = ?", [booking.id, seat.id]);

      if (status !== 'cancelled' && status !== 'pending') {
        totalTickets++;
        const ticketNum = 'CAG-TKT-' + String(totalTickets).padStart(6, '0');
        const qrData = JSON.stringify({ ref: booking.booking_reference, ticket: ticketNum, seat: seat.seat_number, passenger: fn + ' ' + ln });
        await pool.query(
          'INSERT INTO tickets (booking_id, ticket_number, passenger_id, seat_number, qr_code, issued_at) VALUES (?, ?, ?, ?, ?, ?)',
          [booking.id, ticketNum, psg[0]?.id || null, seat.seat_number, qrData, booking.travel_date + 'T' + String(rand(6,10)).padStart(2,'0') + ':' + String(rand(0,59)).padStart(2,'0') + ':00']
        );
      }
    }

    if (status !== 'pending' && status !== 'cancelled') {
      totalPayments++;
      const txId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      await pool.query(
        "INSERT INTO payments (booking_id, transaction_id, amount, payment_method, payment_status, payment_date) VALUES (?, ?, ?, ?, ?, datetime('now'))",
        [booking.id, txId, finalAmt, pick(methods), 'success']
      );
    }
  }
  console.log(`✅ ${totalBookings} bookings — ${totalPayments} payments, ${totalTickets} tickets`);

  // ─── REVIEWS ───────────────────────────────────────────────────────
  const reviewTexts = [
    'Comfortable journey, bus was clean and on time. Will use again!',
    'The AC was not working properly but the driver was very professional.',
    'Excellent service! The WiFi and USB charging made the trip enjoyable.',
    'Average experience. Seats could be more comfortable for long distance.',
    'Best bus service in Zimbabwe. Highly recommended for Harare to Bulawayo route.',
    'The bus was late by 30 minutes but the staff apologised and offered water.',
    'Very smooth ride. The sleeper bus to Victoria Falls is amazing!',
    'Good value for money. Standard bus was fine for the short trip.',
    'Clean, punctual, professional driver. Exactly what I needed.',
    'The booking process was easy and the e-ticket worked perfectly.',
    'Luxury bus is worth the extra cost. Legroom and meals were great.',
    'Would give 5 stars if the bus had Wi-Fi. Otherwise great trip.',
    'My go-to bus service for traveling between Harare and Mutare.',
    'Perfect for family travel. Kids enjoyed the entertainment system.',
    'Great experience overall. Will definitely book again next month.',
    'Nyanga route was scenic and the bus had large windows. Loved it!'
  ];
  const [bookedBookings] = await pool.query("SELECT id FROM bookings WHERE status IN ('completed','confirmed')");
  for (let ri = 0; ri < Math.min(15, bookedBookings.length); ri++) {
    const b = bookedBookings[ri];
    const [si] = await pool.query("SELECT bus_id FROM schedules WHERE id = (SELECT schedule_id FROM bookings WHERE id = ?)", [b.id]);
    if (!si[0]) continue;
    const [ex] = await pool.query("SELECT id FROM reviews WHERE booking_id = ?", [b.id]);
    if (ex.length > 0) continue;
    const rating = rand(2, 5);
    const [usr] = await pool.query("SELECT user_id FROM bookings WHERE id = ?", [b.id]);
    await pool.query(
      "INSERT INTO reviews (user_id, bus_id, booking_id, rating, comment, is_approved, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
      [usr[0].user_id, si[0].bus_id, b.id, rating, pick(reviewTexts), rating >= 3 ? 1 : 0]
    );
    totalReviews++;
  }
  console.log(`✅ ${totalReviews} reviews`);

  console.log(`=== DONE: ${userData.length} users, ${totalBookings} bookings, ${totalPayments} payments, ${totalTickets} tickets, ${totalReviews} reviews ===`);
};
