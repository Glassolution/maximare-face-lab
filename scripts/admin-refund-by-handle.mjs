const url = 'https://xbtendfjajspaidpktsw.supabase.co/functions/v1/subscription-cancel-admin-refund-by-handle';
const anon =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhidGVuZGZqYWpzcGFpZHBrdHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDI1NjIsImV4cCI6MjA4NzMxODU2Mn0.iDqorReGJNx7zlWOVCaoWlf7i-7TWZxtAYRW20jQLBE';
const headers = {
  'x-internal-key': 'test-8d2c9cfe-76a8-44d2-9c23-7a4b5fbf7f2a',
  'Content-Type': 'application/json',
  apikey: anon,
  Authorization: `Bearer ${anon}`,
  'sb-access-token': anon,
  'x-supabase-auth': anon,
};

const handle = process.argv[2];
if (!handle) {
  console.error('Usage: node scripts/admin-refund-by-handle.mjs <username|public_id|short_id>');
  process.exit(1);
}
const reason = process.argv[3] || 'Admin refund by handle';

const body = JSON.stringify({ handle, reason_primary: reason });

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
