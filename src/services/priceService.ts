// ============================================================================
// PRICE SERVICE — CoinGecko API
// ============================================================================
// Fetches live crypto prices from the CoinGecko free API.
// No API key required for basic usage.
// ============================================================================

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export interface PriceData {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

/**
 * Fetch current USD prices for a list of CoinGecko coin IDs.
 * Example IDs: "bitcoin", "ethereum", "solana", "cardano"
 */
export async function fetchPrices(coinIds: string[]): Promise<PriceData> {
  if (coinIds.length === 0) return {};

  const ids = coinIds.join(',');
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('CoinGecko API error:', response.status);
      return {};
    }
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch prices:', error);
    return {};
  }
}

/**
 * Common crypto assets with their CoinGecko IDs.
 * Used as suggestions when adding new assets.
 */
export const POPULAR_CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', coingecko_id: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', coingecko_id: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', coingecko_id: 'solana' },
  { symbol: 'ADA', name: 'Cardano', coingecko_id: 'cardano' },
  { symbol: 'DOT', name: 'Polkadot', coingecko_id: 'polkadot' },
  { symbol: 'AVAX', name: 'Avalanche', coingecko_id: 'avalanche-2' },
  { symbol: 'LINK', name: 'Chainlink', coingecko_id: 'chainlink' },
  { symbol: 'MATIC', name: 'Polygon', coingecko_id: 'matic-network' },
  { symbol: 'XRP', name: 'XRP', coingecko_id: 'ripple' },
  { symbol: 'DOGE', name: 'Dogecoin', coingecko_id: 'dogecoin' },
  { symbol: 'BNB', name: 'BNB', coingecko_id: 'binancecoin' },
  { symbol: 'UNI', name: 'Uniswap', coingecko_id: 'uniswap' },
  { symbol: 'ATOM', name: 'Cosmos', coingecko_id: 'cosmos' },
  { symbol: 'LTC', name: 'Litecoin', coingecko_id: 'litecoin' },
  { symbol: 'NEAR', name: 'NEAR Protocol', coingecko_id: 'near' },
  { symbol: 'ARB', name: 'Arbitrum', coingecko_id: 'arbitrum' },
  { symbol: 'OP', name: 'Optimism', coingecko_id: 'optimism' },
  { symbol: 'AAVE', name: 'Aave', coingecko_id: 'aave' },
];

/**
 * Format a number as USD currency
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as compact USD (e.g., $1.2K, $3.4M)
 */
export function formatUSDCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return formatUSD(value);
}

/**
 * Format a percentage
 */
export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * Format a crypto quantity (up to 8 decimal places, trimmed)
 */
export function formatQuantity(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 8 });
}
