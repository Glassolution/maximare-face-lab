
const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'db.xbtendfjajspaidpktsw.supabase.co',
  database: 'postgres',
  password: '130419fl22XX@',
  port: 5432,
  ssl: { rejectUnauthorized: false } // Required for Supabase connection
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to DB!");

    const res = await client.query(`
      UPDATE public.profiles
      SET 
          subscription_status = 'active',
          is_premium = true,
          premium_since = now(),
          subscription_expires_at = now() + interval '7 days',
          plan_type = 'weekly',
          premium_plan_id = 'weekly',
          payment_provider = 'manual_fix_mp_delay',
          payment_status = 'approved',
          updated_at = now()
      WHERE id = (SELECT id FROM auth.users WHERE email = 'xavierluisfelipe12@gmail.com')
      RETURNING *;
    `);

    console.log("Updated rows:", res.rowCount);
    if (res.rowCount > 0) {
        console.log("Updated user profile:", res.rows[0].id);
    } else {
        console.log("User not found or update failed.");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
