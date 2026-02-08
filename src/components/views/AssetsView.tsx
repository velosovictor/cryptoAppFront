// ========================================================================
// ASSETS VIEW
// ========================================================================
// Manage tracked assets. Holdings are READ-ONLY — computed from trades.
// ========================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Stack,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CurrencyBitcoin as CryptoIcon,
  AttachMoney as CashIcon,
  AccountBalanceWallet as WalletIcon,
  SwapVert as TradeIcon,
} from '@mui/icons-material';
import {
  getApi,
  ENTITIES,
} from '../../services/datablokApi';
import type { Asset, CreateAssetInput, Holding, Trade } from '../../services/datablokApi';
import { POPULAR_CRYPTOS, formatUSD, formatQuantity } from '../../services/priceService';

const ASSET_TYPE_LABELS: Record<string, string> = {
  crypto: 'Cryptocurrency',
  stablecoin: 'Stablecoin',
  cash: 'Cash',
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  crypto: '#8b5cf6',
  stablecoin: '#10b981',
  cash: '#3b82f6',
};

export default function AssetsView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Asset dialog
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [assetForm, setAssetForm] = useState<CreateAssetInput>({
    symbol: '',
    name: '',
    asset_type: 'crypto',
    coingecko_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, holdingsRes, tradesRes] = await Promise.all([
        getApi().getAll<Asset>(ENTITIES.ASSETS),
        getApi().getAll<Holding>(ENTITIES.HOLDINGS),
        getApi().getAll<Trade>(ENTITIES.TRADES),
      ]);
      setAssets(assetsRes);
      setHoldings(holdingsRes);
      setTrades(tradesRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Asset CRUD ----
  const handleAddAsset = () => {
    setAssetForm({ symbol: '', name: '', asset_type: 'crypto', coingecko_id: '' });
    setAssetDialogOpen(true);
  };

  const handleSelectCrypto = (crypto: typeof POPULAR_CRYPTOS[0] | null) => {
    if (crypto) {
      setAssetForm({
        symbol: crypto.symbol,
        name: crypto.name,
        asset_type: 'crypto',
        coingecko_id: crypto.coingecko_id,
      });
    }
  };

  const handleSaveAsset = async () => {
    if (!assetForm.symbol || !assetForm.name) return;
    setSaving(true);
    try {
      await getApi().create<Asset>(ENTITIES.ASSETS, assetForm);
      setAssetDialogOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!deleteAssetId) return;
    try {
      // Delete associated holding first
      const holding = holdings.find((h) => h.asset_id === deleteAssetId);
      if (holding) {
        await getApi().remove(ENTITIES.HOLDINGS, holding.id);
      }
      // Delete associated trades
      const assetTrades = trades.filter((t) => t.asset_id === deleteAssetId);
      for (const trade of assetTrades) {
        await getApi().remove(ENTITIES.TRADES, trade.id);
      }
      await getApi().remove(ENTITIES.ASSETS, deleteAssetId);
      setDeleteAssetId(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete asset');
    }
  };

  const getHolding = (assetId: string) => holdings.find((h) => h.asset_id === assetId);
  const getTradeCount = (assetId: string) => trades.filter((t) => t.asset_id === assetId).length;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Assets & Holdings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your tracked assets. Holdings are automatically computed from trade history.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddAsset}>
          Add Asset
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Info banner */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<TradeIcon />}>
        Quantity and average buy price are computed from your trade history.
        To update them, <Button size="small" href="/trades" sx={{ textTransform: 'none', ml: 0.5, p: 0, minWidth: 'auto' }}>record a trade</Button>.
      </Alert>

      {assets.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <WalletIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            No Assets Yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Add the crypto assets you want to track in your portfolio.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddAsset}>
            Add First Asset
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {assets.map((asset) => {
            const holding = getHolding(asset.id);
            const qty = holding ? Number(holding.quantity) : 0;
            const avgPrice = holding ? Number(holding.average_buy_price) || 0 : 0;
            const totalCost = qty * avgPrice;
            const tradeCount = getTradeCount(asset.id);

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={asset.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {asset.asset_type === 'cash' ? (
                          <CashIcon sx={{ color: ASSET_TYPE_COLORS[asset.asset_type], fontSize: 28 }} />
                        ) : (
                          <CryptoIcon sx={{ color: ASSET_TYPE_COLORS[asset.asset_type], fontSize: 28 }} />
                        )}
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {asset.symbol}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {asset.name}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={ASSET_TYPE_LABELS[asset.asset_type]}
                        size="small"
                        sx={{
                          bgcolor: `${ASSET_TYPE_COLORS[asset.asset_type]}15`,
                          color: ASSET_TYPE_COLORS[asset.asset_type],
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Quantity</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {qty > 0 ? formatQuantity(qty) : '—'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Avg Buy Price</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {avgPrice > 0 ? formatUSD(avgPrice) : '—'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Total Cost</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {totalCost > 0 ? formatUSD(totalCost) : '—'}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Trades</Typography>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">
                          {tradeCount > 0 ? `${tradeCount} recorded` : 'No trades yet'}
                        </Typography>
                      </Box>
                      {asset.coingecko_id && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">CoinGecko ID</Typography>
                          <Typography variant="body2" fontWeight={500} sx={{ color: 'text.secondary' }}>
                            {asset.coingecko_id}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      startIcon={<TradeIcon />}
                      href="/trades"
                    >
                      Record Trade
                    </Button>
                    <Tooltip title="Delete asset">
                      <IconButton size="small" color="error" onClick={() => setDeleteAssetId(asset.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add Asset Dialog */}
      <Dialog open={assetDialogOpen} onClose={() => setAssetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Asset</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Quick select from popular cryptos */}
            <Autocomplete
              options={POPULAR_CRYPTOS}
              getOptionLabel={(option) => `${option.symbol} — ${option.name}`}
              onChange={(_, value) => handleSelectCrypto(value)}
              renderInput={(params) => (
                <TextField {...params} label="Quick Select (Popular Cryptos)" placeholder="Search..." />
              )}
            />

            <Divider>or manually</Divider>

            <TextField
              select
              label="Asset Type"
              value={assetForm.asset_type}
              onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value as 'crypto' | 'stablecoin' | 'cash' })}
              fullWidth
            >
              <MenuItem value="crypto">Cryptocurrency</MenuItem>
              <MenuItem value="stablecoin">Stablecoin</MenuItem>
              <MenuItem value="cash">Cash (USD)</MenuItem>
            </TextField>

            <TextField
              label="Symbol"
              value={assetForm.symbol}
              onChange={(e) => setAssetForm({ ...assetForm, symbol: e.target.value.toUpperCase() })}
              fullWidth
              placeholder="e.g., BTC"
            />

            <TextField
              label="Name"
              value={assetForm.name}
              onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
              fullWidth
              placeholder="e.g., Bitcoin"
            />

            <TextField
              label="CoinGecko ID (for live prices)"
              value={assetForm.coingecko_id}
              onChange={(e) => setAssetForm({ ...assetForm, coingecko_id: e.target.value })}
              fullWidth
              placeholder="e.g., bitcoin"
              helperText="Leave empty for cash assets. Find IDs at coingecko.com"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssetDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveAsset}
            disabled={saving || !assetForm.symbol || !assetForm.name}
          >
            {saving ? <CircularProgress size={20} /> : 'Add Asset'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteAssetId} onClose={() => setDeleteAssetId(null)}>
        <DialogTitle>Delete Asset</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this asset? This will also remove its holding and all associated trades.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAssetId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAsset}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
