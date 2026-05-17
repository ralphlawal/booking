require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function seed() {
  console.log('Seeding demo data…');
  const hash = await bcrypt.hash('demo1234', 12);

  if (process.env.DATABASE_URL) {
    // PostgreSQL seed
    const { pool } = require('../src/config/database.pg');
    const client = await pool.connect();
    try {
      const userId = crypto.randomUUID();
      const bizId = crypto.randomUUID();

      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`,
        [userId, 'demo@bookly.com', hash, 'Demo Owner']
      );
      const { rows: [user] } = await client.query('SELECT id FROM users WHERE email = $1', ['demo@bookly.com']);
      await client.query(
        `INSERT INTO businesses (id,user_id,name,slug,description,phone,email,location,category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (slug) DO NOTHING`,
        [bizId, user.id, 'Smooth Cuts Barbershop', 'smoothcuts', 'Premium haircuts and grooming services', '+1-555-0100', 'smoothcuts@demo.com', '123 Main St, New York', 'barber']
      );
      const { rows: [biz] } = await client.query('SELECT id FROM businesses WHERE slug = $1', ['smoothcuts']);
      for (const [name, desc, price, dur] of [
        ['Classic Haircut','Clean fade with edge up', 30, 30],
        ['Beard Trim','Shape and clean beard trim', 20, 20],
        ['Full Grooming Package','Haircut + Beard + Wash', 65, 75],
      ]) {
        await client.query(
          `INSERT INTO services (id,business_id,name,description,price,duration_minutes) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [crypto.randomUUID(), biz.id, name, desc, price, dur]
        );
      }
      await client.query(
        `INSERT INTO availability_settings (id,business_id,working_days,opening_time,closing_time,slot_interval_minutes)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (business_id) DO NOTHING`,
        [crypto.randomUUID(), biz.id, JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday']), '09:00', '18:00', 30]
      );
    } finally {
      client.release();
      await pool.end();
    }
  } else {
    // SQLite seed
    const { db } = require('../src/config/database.sqlite');
    const userId = crypto.randomUUID();
    const bizId = crypto.randomUUID();
    db.prepare(`INSERT OR IGNORE INTO users (id,email,password_hash,full_name) VALUES (?,?,?,?)`).run(userId,'demo@bookly.com',hash,'Demo Owner');
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@bookly.com');
    db.prepare(`INSERT OR IGNORE INTO businesses (id,user_id,name,slug,description,phone,email,location,category) VALUES (?,?,?,?,?,?,?,?,?)`).run(bizId,user.id,'Smooth Cuts Barbershop','smoothcuts','Premium haircuts and grooming services','+1-555-0100','smoothcuts@demo.com','123 Main St, New York','barber');
    const biz = db.prepare('SELECT id FROM businesses WHERE slug = ?').get('smoothcuts');
    for (const [name, desc, price, dur] of [['Classic Haircut','Clean fade with edge up',30,30],['Beard Trim','Shape and clean beard trim',20,20],['Full Grooming Package','Haircut + Beard + Wash',65,75]]) {
      db.prepare(`INSERT OR IGNORE INTO services (id,business_id,name,description,price,duration_minutes) VALUES (?,?,?,?,?,?)`).run(crypto.randomUUID(),biz.id,name,desc,price,dur);
    }
    db.prepare(`INSERT OR IGNORE INTO availability_settings (id,business_id,working_days,opening_time,closing_time,slot_interval_minutes) VALUES (?,?,?,?,?,?)`).run(crypto.randomUUID(),biz.id,JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday']),'09:00','18:00',30);
  }

  console.log('Demo seeded!  Email: demo@bookly.com  Password: demo1234');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
