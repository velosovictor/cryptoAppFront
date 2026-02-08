// ============================================================================
// SEED SCRIPT — Populate test data for CryptoPortfolio
// ============================================================================
// Usage: node seed.mjs
// It will register a test user (or login if exists), then create
// assets, holdings, target allocations, and sample trades.
// ============================================================================

const API = 'https://cryptoportfolio-c2b16586-staging.rationalbloks.com';

// Test user credentials
const TEST_USER = {
  email: 'seeduser@cryptotest.com',
  password: 'CryptoSeed2026!',
  first_name: 'Crypto',
  last_name: 'Investor',
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
  const data = await res.json();
  if (!res.ok) {
    console.error(`❌ ${method} ${path} — ${res.status}:`, data);
    return null;
  }
  return data;
}

async function authenticate() {
  console.log('🔐 Logging in...');
  const res = await api('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  if (!res || !res.access_token) {
    console.log('   Login failed, trying register...');
    const regRes = await api('POST', '/api/auth/register', TEST_USER);
    if (!regRes || !regRes.access_token) {
      console.error('❌ Authentication failed!');
      process.exit(1);
    }
    token = regRes.access_token;
  } else {
    token = res.access_token;
  }
  console.log('✅ Authenticated as:', TEST_USER.email);
}

async function seed() {
  await authenticate();

  // ---- 1. Create Assets ----
  console.log('\n📦 Creating assets...');

  const assetDefs = [
    { symbol: 'BTC', name: 'Bitcoin', asset_type: 'crypto', coingecko_id: 'bitcoin' },
    { symbol: 'ETH', name: 'Ethereum', asset_type: 'crypto', coingecko_id: 'ethereum' },
    { symbol: 'SOL', name: 'Solana', asset_type: 'crypto', coingecko_id: 'solana' },
    { symbol: 'ADA', name: 'Cardano', asset_type: 'crypto', coingecko_id: 'cardano' },
    { symbol: 'USD', name: 'US Dollar (Cash)', asset_type: 'cash', coingecko_id: '' },
  ];

  const assets = {};
  for (const def of assetDefs) {
    const asset = await api('POST', '/api/assets/', def);
    if (asset) {
      assets[def.symbol] = asset.id;
      console.log(`   ✅ ${def.symbol} — ${def.name} (id: ${asset.id})`);
    }
  }

  // If assets already exist, fetch them
  if (Object.keys(assets).length < assetDefs.length) {
    const existing = await api('GET', '/api/assets/');
    if (existing) {
      for (const a of existing) {
        if (!assets[a.symbol]) {
          assets[a.symbol] = a.id;
          console.log(`   ♻️  Found existing: ${a.symbol} (id: ${a.id})`);
        }
      }
    }
  }

  // ---- 2. Create Holdings ----
  console.log('\n💰 Creating holdings...');

  const holdingDefs = [
    { symbol: 'BTC', quantity: 1.5, average_buy_price: 42000 },
    { symbol: 'ETH', quantity: 15, average_buy_price: 2800 },
    { symbol: 'SOL', quantity: 200, average_buy_price: 95 },
    { symbol: 'ADA', quantity: 10000, average_buy_price: 0.45 },
    { symbol: 'USD', quantity: 25000, average_buy_price: 1 },
  ];

  for (const h of holdingDefs) {
    if (!assets[h.symbol]) { console.log(`   ⏭️  Skipping ${h.symbol} (no asset)`); continue; }
    const holding = await api('POST', '/api/holdings/', {
      asset_id: assets[h.symbol],
      quantity: h.quantity,
      average_buy_price: h.average_buy_price,
    });
    if (holding) {
      console.log(`   ✅ ${h.symbol}: ${h.quantity} units @ $${h.average_buy_price}`);
    }
  }

  // ---- 3. Create Target Allocations ----
  console.log('\n🎯 Creating target allocations...');

  const targetDefs = [
    { symbol: 'BTC', target_percentage: 35 },
    { symbol: 'ETH', target_percentage: 25 },
    { symbol: 'SOL', target_percentage: 15 },
    { symbol: 'ADA', target_percentage: 5 },
    { symbol: 'USD', target_percentage: 20 },
  ];

  for (const t of targetDefs) {
    if (!assets[t.symbol]) { console.log(`   ⏭️  Skipping ${t.symbol} (no asset)`); continue; }
    const target = await api('POST', '/api/target_allocations/', {
      asset_id: assets[t.symbol],
      target_percentage: t.target_percentage,
    });
    if (target) {
      console.log(`   ✅ ${t.symbol}: ${t.target_percentage}%`);
    }
  }

  // ---- 4. Create Sample Trades ----
  console.log('\n📈 Creating sample trades...');

  const tradeDefs = [
    { symbol: 'BTC', trade_type: 'BUY', quantity: 0.5, price_per_unit: 38000, days_ago: 90 },
    { symbol: 'BTC', trade_type: 'BUY', quantity: 0.5, price_per_unit: 42000, days_ago: 60 },
    { symbol: 'BTC', trade_type: 'BUY', quantity: 0.5, price_per_unit: 46000, days_ago: 30 },
    { symbol: 'ETH', trade_type: 'BUY', quantity: 10, price_per_unit: 2500, days_ago: 75 },
    { symbol: 'ETH', trade_type: 'BUY', quantity: 5, price_per_unit: 3200, days_ago: 20 },
    { symbol: 'SOL', trade_type: 'BUY', quantity: 100, price_per_unit: 80, days_ago: 80 },
    { symbol: 'SOL', trade_type: 'BUY', quantity: 150, price_per_unit: 100, days_ago: 40 },
    { symbol: 'SOL', trade_type: 'SELL', quantity: 50, price_per_unit: 120, days_ago: 10 },
    { symbol: 'ADA', trade_type: 'BUY', quantity: 5000, price_per_unit: 0.40, days_ago: 100 },
    { symbol: 'ADA', trade_type: 'BUY', quantity: 5000, price_per_unit: 0.50, days_ago: 50 },
    { symbol: 'ETH', trade_type: 'SELL', quantity: 2, price_per_unit: 3500, days_ago: 5 },
  ];

  for (const t of tradeDefs) {
    if (!assets[t.symbol]) { console.log(`   ⏭️  Skipping ${t.symbol} trade`); continue; }
    const tradeDate = new Date();
    tradeDate.setDate(tradeDate.getDate() - t.days_ago);
    // Use naive datetime string (no timezone suffix) for PostgreSQL
    const dateStr = tradeDate.toISOString().replace('Z', '').split('.')[0];

    const trade = await api('POST', '/api/trades/', {
      asset_id: assets[t.symbol],
      trade_type: t.trade_type,
      quantity: t.quantity,
      price_per_unit: t.price_per_unit,
      total_value: Number((t.quantity * t.price_per_unit).toFixed(2)),
      trade_date: dateStr,
      notes: `${t.trade_type} ${t.quantity} ${t.symbol} @ $${t.price_per_unit}`,
    });
    if (trade) {
      console.log(`   ✅ ${t.trade_type} ${t.quantity} ${t.symbol} @ $${t.price_per_unit} (${t.days_ago}d ago)`);
    }
  }

  console.log('\n🎉 Seed complete! Login with:');
  console.log(`   Email: ${TEST_USER.email}`);
  console.log(`   Password: ${TEST_USER.password}`);
}

seed().catch(console.error);
