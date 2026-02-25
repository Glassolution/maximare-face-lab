
console.log("Starting DB fix script...");
const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'db.xbtendfjajspaidpktsw.supabase.co',
  database: 'postgres',
  password: '130419fl22XX@',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Connected to DB!");

    await client.query(`DROP FUNCTION IF EXISTS public.get_user_id_by_email(text);`);

    // We recreate it using 'email_input' to be safe with potentially old deployed code
    // AND we can add an alias or just use the old name if that's what the server expects.
    // Ideally, we support BOTH if possible, but PG function overloading is by types, not param names.
    // However, if the RPC call uses named parameters: rpc('func', { param_name: val }), the param name MUST match.
    // If the server uses 'email_input', we MUST use 'email_input'.
    // If the server uses 'email', we MUST use 'email'.
    // We can define TWO functions if they have different names, but we can't have two 'get_user_id_by_email' with same signature but different arg names (PG doesn't distinguish).
    // Wait, PG DOES allow named parameters in function definition.
    // If we define "get_user_id_by_email(email_input text)", and call it with { email_input: ... }, it works.
    // If we call it with { email: ... }, it fails "function ... does not exist".
    
    // STRATEGY: Define the function with 'email_input' (legacy support) AND create a wrapper 'get_user_id_by_email_v2' or similar? No, the caller calls 'get_user_id_by_email'.
    
    // Better strategy: Define the function to take a JSONB object? No, strict types.
    // Best strategy: Define 'get_user_id_by_email(email_input text)'.
    // AND Define a SECOND function 'get_user_id_by_email(email text)'? No, signature collision (text vs text).
    
    // Hack: Create the function with a default parameter?
    // CREATE FUNCTION get_user_id_by_email(email_input text DEFAULT null, email text DEFAULT null) ...
    // This changes the signature to take 2 arguments.
    // If caller calls { email_input: '...' }, 'email' is null.
    // If caller calls { email: '...' }, 'email_input' is null.
    // Logic: use COALESCE(email_input, email).
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input text DEFAULT null, email text DEFAULT null)
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        uid uuid;
        final_email text;
      BEGIN
        final_email := COALESCE(email_input, email);
        
        SELECT id INTO uid
        FROM auth.users
        WHERE auth.users.email = final_email;
        
        RETURN uid;
      END;
      $$;
    `);

    // Force approve user 507b50a7-22bb-46fd-b4a4-2eb2db623862
    await client.query(`
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
        WHERE id = '507b50a7-22bb-46fd-b4a4-2eb2db623862';
    `);
    console.log("User 507b50a7-22bb-46fd-b4a4-2eb2db623862 approved manually.");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
