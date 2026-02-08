// ============================================================================
// CLEANUP SCRIPT — Remove duplicate seed data
// ============================================================================
// Usage: node cleanup.mjs
// Logs in, finds duplicates, keeps only one of each, deletes the rest.
// ============================================================================

const API = 'https://cryptoportfolio-c2b16586-staging.rationalbloks.com';

const TEST_USER = {
  email: 'seeduser@cryptotest.com',
  password: 'CryptoSeed2026!',
};

let token = '';

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === 'DELETE' && res.status === 204) return true;
  const data = await res.json();
  if (!res.ok) {
    console.error(`❌ ${method} ${path} — ${res.status}:`, data);
    return null;
  }
  return data;
}

async function main() {
  // Login
  console.log('🔐 Logging in...');
  const loginRes = await api('POST', '/api/auth/login', TEST_USER);
  if (!loginRes?.access_token) { console.error('Login failed'); process.exit(1); }
  token = loginRes.access_token;
  console.log('✅ Authenticated');

  // Fetch all data
  const [assets, holdings, targets, trades] = await Promise.all([
    api('GET', '/api/assets/'),
    api('GET', '/api/holdings/'),
    api('GET', '/api/target_allocations/'),
    api('GET', '/api/trades/'),
  ]);

  console.log(`\nFound: ${assets.length} assets, ${holdings.length} holdings, ${targets.length} targets, ${trades.length} trades`);

  // --- Delete ALL trades, targets, holdings first (they reference assets) ---
  console.log('\n🗑️  Deleting all trades...');
  for (const t of trades) {
    await api('DELETE', `/api/trades/${t.id}`);
    console.log(`   Deleted trade ${t.id}`);
  }

  console.log('🗑️  Deleting all target allocations...');
  for (const t of targets) {
    await api('DELETE', `/api/target_allocations/${t.id}`);
    console.log(`   Deleted target ${t.id}`);
  }

  console.log('🗑️  Deleting all holdings...');
  for (const h of holdings) {
    await api('DELETE', `/api/holdings/${h.id}`);
    console.log(`   Deleted holding ${h.id}`);
  }

  console.log('🗑️  Deleting all assets...');
  for (const a of assets) {
    await api('DELETE', `/api/assets/${a.id}`);
    console.log(`   Deleted asset ${a.symbol} (${a.id})`);
  }

  console.log('\n✅ All data cleaned. Run "node seed.mjs" to re-seed clean data.');
}

main().catch(console.error);
