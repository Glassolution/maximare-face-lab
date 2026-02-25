
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const client = new Client({
  user: "postgres",
  database: "postgres",
  hostname: "db.xbtendfjajspaidpktsw.supabase.co",
  port: 5432,
  password: "130419fl22XX@",
  tls: { enabled: false } // Supabase requires SSL, but let's try false first or true. Usually needs CA.
});

// Try with SSL required usually.
// For Deno postgres, 'tls: { enabled: true }' is often enough if no strict cert check.

try {
  await client.connect();
  console.log("Connected to DB!");

  const result = await client.queryObject`
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
    RETURNING id;
  `;

  console.log("Updated rows:", result.rowCount);
  console.log("Updated user ID:", result.rows[0]?.id);

} catch (err) {
  console.error("Error:", err);
} finally {
  await client.end();
}
