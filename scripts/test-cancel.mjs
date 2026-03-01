const url = 'https://nmygcbzkgpjrueetdktz.supabase.co/functions/v1/subscription-cancel-admin-test';
const anon =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teWdjYnprZ3BqcnVlZXRka3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MjY0MDAsImV4cCI6MjA4NjAwMjQwMH0.z9ukafxP1VsZI9a7C4KL27jqRPEtBzl05avPnSpzavE';
const headers = {
  'x-internal-key': 'test-8d2c9cfe-76a8-44d2-9c23-7a4b5fbf7f2a',
  'Content-Type': 'application/json',
  apikey: anon,
  Authorization: `Bearer ${anon}`,
};
// Use a deterministic test user id that doesn't collide with real users
const body = JSON.stringify({
  user_id: '00000000-0000-0000-0000-00000000c0de',
  reason_primary: 'Teste automatizado via script',
});

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
