const url = 'https://xbtendfjajspaidpktsw.supabase.co/functions/v1/ensure-profile';
const anon =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhidGVuZGZqYWpzcGFpZHBrdHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDI1NjIsImV4cCI6MjA4NzMxODU2Mn0.iDqorReGJNx7zlWOVCaoWlf7i-7TWZxtAYRW20jQLBE';
const headers = {
  'x-internal-key': 'test-8d2c9cfe-76a8-44d2-9c23-7a4b5fbf7f2a',
  'Content-Type': 'application/json',
  apikey: anon,
  Authorization: `Bearer ${anon}`,
};

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/ensure-profile.mjs <user_uuid>');
  process.exit(1);
}

const body = JSON.stringify({ user_id: userId });

async function run() {
  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (e) {
    console.error('Request failed:', e);
    process.exitCode = 1;
  }
}
run();

