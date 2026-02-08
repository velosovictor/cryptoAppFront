// ========================================================================
// DASHBOARD VIEW
// ========================================================================
// Main portfolio dashboard: holdings overview, allocation comparison,
// live prices, and rebalancing recommendations.
// ========================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider,
  Stack,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as PortfolioIcon,
  PieChart as PieChartIcon,
  SwapHoriz as RebalanceIcon,
  Refresh as RefreshIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import {
  useClientAuth,
  getApi,
  ENTITIES,
} from '../../services/datablokApi';
import type { Asset, Holding, TargetAllocation } from '../../services/datablokApi';
import {
  fetchPrices,
  formatUSD,
  formatPercent,
  formatQuantity,
} from '../../services/priceService';
import type { PriceData } from '../../services/priceService';

// ---- Types ----
interface EnrichedHolding {
  asset: Asset;
  holding: Holding;
  currentPrice: number;
  change24h: number;
  totalValue: number;
  allocationPercent: number;
}

interface RebalanceAction {
  asset: Asset;
  currentPercent: number;
  targetPercent: number;
  diffPercent: number;
  diffValue: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  quantity: number;
  price: number;
}

// ---- Stat Card ----
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard = ({ title, value, subtitle, icon, color, trend }: StatCardProps) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary',
                fontWeight: 600,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: 1.2,
            borderRadius: 2,
            bgcolor: `${color}15`,
            color: color,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ---- Allocation Bar ----
const AllocationBar = ({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="body2" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {current.toFixed(1)}% / {target.toFixed(1)}%
      </Typography>
    </Box>
    <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: '#e5e7eb' }}>
      {/* Target line */}
      <Box
        sx={{
          position: 'absolute',
          left: `${Math.min(target, 100)}%`,
          top: -2,
          bottom: -2,
          width: 2,
          bgcolor: '#374151',
          borderRadius: 1,
          zIndex: 2,
        }}
      />
      {/* Current bar */}
      <LinearProgress
        variant="determinate"
        value={Math.min(current, 100)}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: 'transparent',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
        }}
      />
    </Box>
  </Box>
);

// ---- Asset Colors ----
const ASSET_COLORS: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  SOL: '#9945FF',
  ADA: '#0033AD',
  DOT: '#E6007A',
  AVAX: '#E84142',
  LINK: '#2A5ADA',
  MATIC: '#8247E5',
  XRP: '#00AAE4',
  DOGE: '#C3A634',
  BNB: '#F3BA2F',
  CASH: '#10b981',
  USD: '#10b981',
  USDT: '#26A17B',
  USDC: '#2775CA',
};

function getAssetColor(symbol: string): string {
  return ASSET_COLORS[symbol.toUpperCase()] || '#6b7280';
}

// ========================================================================
// MAIN COMPONENT
// ========================================================================

export default function DashboardView() {
  const { user } = useClientAuth();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [targets, setTargets] = useState<TargetAllocation[]>([]);
  const [prices, setPrices] = useState<PriceData>({});
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Fetch Data ----
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, holdingsRes, targetsRes] = await Promise.all([
        getApi().getAll<Asset>(ENTITIES.ASSETS),
        getApi().getAll<Holding>(ENTITIES.HOLDINGS),
        getApi().getAll<TargetAllocation>(ENTITIES.TARGET_ALLOCATIONS),
      ]);
      setAssets(assetsRes);
      setHoldings(holdingsRes);
      setTargets(targetsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Fetch Prices ----
  const fetchLivePrices = useCallback(async () => {
    const coinIds = assets
      .filter((a) => a.coingecko_id)
      .map((a) => a.coingecko_id!);
    if (coinIds.length === 0) return;
    setPriceLoading(true);
    try {
      const data = await fetchPrices(coinIds);
      setPrices(data);
    } finally {
      setPriceLoading(false);
    }
  }, [assets]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (assets.length > 0) {
      fetchLivePrices();
      // Refresh prices every 60s
      const interval = setInterval(fetchLivePrices, 60_000);
      return () => clearInterval(interval);
    }
  }, [assets, fetchLivePrices]);

  // ---- Compute Enriched Holdings ----
  const enrichedHoldings = useMemo<EnrichedHolding[]>(() => {
    if (assets.length === 0 || holdings.length === 0) return [];

    const assetMap = new Map(assets.map((a) => [a.id, a]));

    const list: EnrichedHolding[] = holdings
      .map((h) => {
        const asset = assetMap.get(h.asset_id);
        if (!asset) return null;

        let currentPrice = 0;
        let change24h = 0;

        if (asset.asset_type === 'cash') {
          currentPrice = 1;
        } else if (asset.coingecko_id && prices[asset.coingecko_id]) {
          currentPrice = prices[asset.coingecko_id].usd;
          change24h = prices[asset.coingecko_id].usd_24h_change || 0;
        }

        const totalValue = Number(h.quantity) * currentPrice;

        return { asset, holding: h, currentPrice, change24h, totalValue, allocationPercent: 0 };
      })
      .filter(Boolean) as EnrichedHolding[];

    const totalPortfolioValue = list.reduce((sum, e) => sum + e.totalValue, 0);
    list.forEach((e) => {
      e.allocationPercent = totalPortfolioValue > 0 ? (e.totalValue / totalPortfolioValue) * 100 : 0;
    });

    return list.sort((a, b) => b.totalValue - a.totalValue);
  }, [assets, holdings, prices]);

  const totalPortfolioValue = useMemo(
    () => enrichedHoldings.reduce((sum, e) => sum + e.totalValue, 0),
    [enrichedHoldings]
  );

  // ---- Rebalancing Recommendations ----
  const rebalanceActions = useMemo<RebalanceAction[]>(() => {
    if (enrichedHoldings.length === 0 || targets.length === 0 || totalPortfolioValue === 0) return [];

    const assetMap = new Map(assets.map((a) => [a.id, a]));
    const holdingValueMap = new Map(enrichedHoldings.map((e) => [e.asset.id, e]));

    const actions: RebalanceAction[] = targets
      .map((t) => {
        const asset = assetMap.get(t.asset_id);
        if (!asset) return null;

        const enriched = holdingValueMap.get(t.asset_id);
        const currentPercent = enriched ? enriched.allocationPercent : 0;
        const targetPercent = Number(t.target_percentage);
        const diffPercent = targetPercent - currentPercent;
        const diffValue = (diffPercent / 100) * totalPortfolioValue;
        const price = enriched?.currentPrice || 0;
        const quantity = price > 0 ? Math.abs(diffValue) / price : 0;

        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        if (diffPercent > 1) action = 'BUY';
        else if (diffPercent < -1) action = 'SELL';

        return { asset, currentPercent, targetPercent, diffPercent, diffValue, action, quantity, price };
      })
      .filter(Boolean) as RebalanceAction[];

    return actions.sort((a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent));
  }, [enrichedHoldings, targets, assets, totalPortfolioValue]);

  // ---- Weighted 24h Change ----
  const weighted24hChange = useMemo(() => {
    if (totalPortfolioValue === 0 || enrichedHoldings.length === 0) return 0;
    return enrichedHoldings.reduce(
      (sum, e) => sum + (e.change24h * e.totalValue) / totalPortfolioValue,
      0
    );
  }, [enrichedHoldings, totalPortfolioValue]);

  // ---- Render ----
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">Loading portfolio...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" action={<Button onClick={fetchData}>Retry</Button>}>{error}</Alert>
      </Container>
    );
  }

  const hasData = enrichedHoldings.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Portfolio Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.first_name || 'Investor'}.
            {priceLoading && (
              <Chip label="Updating prices..." size="small" sx={{ ml: 1 }} />
            )}
          </Typography>
        </Box>
        <Tooltip title="Refresh prices">
          <IconButton onClick={fetchLivePrices} disabled={priceLoading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {!hasData ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <PortfolioIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Start Building Your Portfolio
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Add assets, record your holdings, and set target allocations to get personalized
            rebalancing recommendations.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="contained" href="/assets">
              Add Assets
            </Button>
            <Button variant="outlined" href="/targets">
              Set Targets
            </Button>
          </Stack>
        </Paper>
      ) : (
        <>
          {/* Stats Row */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Total Portfolio Value"
                value={formatUSD(totalPortfolioValue)}
                icon={<PortfolioIcon />}
                color="#3b82f6"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="24h Change"
                value={formatPercent(weighted24hChange)}
                subtitle={formatUSD(totalPortfolioValue * (weighted24hChange / 100))}
                icon={weighted24hChange >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                color={weighted24hChange >= 0 ? '#10b981' : '#ef4444'}
                trend={weighted24hChange >= 0 ? 'up' : 'down'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Assets Tracked"
                value={String(enrichedHoldings.length)}
                icon={<PieChartIcon />}
                color="#8b5cf6"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Rebalance Actions"
                value={String(rebalanceActions.filter((a) => a.action !== 'HOLD').length)}
                subtitle={rebalanceActions.filter((a) => a.action !== 'HOLD').length > 0 ? 'Actions needed' : 'Portfolio balanced'}
                icon={<RebalanceIcon />}
                color="#f59e0b"
                trend={rebalanceActions.filter((a) => a.action !== 'HOLD').length > 0 ? 'down' : 'up'}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Holdings Table */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Holdings
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Asset</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">24h</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell align="right">Alloc.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {enrichedHoldings.map((e) => (
                        <TableRow key={e.holding.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: getAssetColor(e.asset.symbol),
                                }}
                              />
                              <Box>
                                <Typography fontWeight={600} variant="body2">
                                  {e.asset.symbol}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {e.asset.name}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{formatUSD(e.currentPrice)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{
                                color: e.change24h >= 0 ? 'success.main' : 'error.main',
                                fontWeight: 600,
                              }}
                            >
                              {formatPercent(e.change24h)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{formatQuantity(Number(e.holding.quantity))}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {formatUSD(e.totalValue)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{e.allocationPercent.toFixed(1)}%</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Allocation Comparison */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Current vs Target Allocation
                </Typography>
                {targets.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary" gutterBottom>
                      No targets set yet
                    </Typography>
                    <Button variant="outlined" size="small" href="/targets">
                      Set Targets
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    {rebalanceActions.map((ra) => (
                      <AllocationBar
                        key={ra.asset.id}
                        label={ra.asset.symbol}
                        current={ra.currentPercent}
                        target={ra.targetPercent}
                        color={getAssetColor(ra.asset.symbol)}
                      />
                    ))}
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f9fafb', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Black markers indicate target allocation. Bars show current allocation.
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Rebalancing Recommendations */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <RebalanceIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Rebalancing Recommendations
                  </Typography>
                </Box>
                {rebalanceActions.length === 0 ? (
                  <Typography color="text.secondary">
                    Set target allocations to see rebalancing recommendations.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Asset</TableCell>
                          <TableCell align="right">Current</TableCell>
                          <TableCell align="right">Target</TableCell>
                          <TableCell align="right">Deviation</TableCell>
                          <TableCell align="center">Action</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rebalanceActions.map((ra) => (
                          <TableRow key={ra.asset.id} hover>
                            <TableCell>
                              <Typography fontWeight={600} variant="body2">
                                {ra.asset.symbol}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{ra.currentPercent.toFixed(1)}%</TableCell>
                            <TableCell align="right">{ra.targetPercent.toFixed(1)}%</TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                sx={{
                                  color:
                                    Math.abs(ra.diffPercent) <= 1
                                      ? 'text.secondary'
                                      : ra.diffPercent > 0
                                      ? 'success.main'
                                      : 'error.main',
                                  fontWeight: 600,
                                }}
                              >
                                {ra.diffPercent > 0 ? '+' : ''}
                                {ra.diffPercent.toFixed(1)}%
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {ra.action === 'BUY' && (
                                <Chip
                                  icon={<ArrowUpIcon sx={{ fontSize: 16 }} />}
                                  label="BUY"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              )}
                              {ra.action === 'SELL' && (
                                <Chip
                                  icon={<ArrowDownIcon sx={{ fontSize: 16 }} />}
                                  label="SELL"
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                />
                              )}
                              {ra.action === 'HOLD' && (
                                <Chip label="HOLD" size="small" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {ra.action !== 'HOLD' ? (
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {ra.action === 'BUY' ? '+' : '-'}
                                    {formatQuantity(ra.quantity)} {ra.asset.symbol}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ≈ {formatUSD(Math.abs(ra.diffValue))}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                  Recommendations are based on your current holdings and target allocations.
                  Deviations within ±1% are considered balanced.
                  Prices update every 60 seconds from CoinGecko.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
}
