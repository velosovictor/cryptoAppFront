// ========================================================================
// TRADES VIEW
// ========================================================================
// Trade history and trade insertion/management.
// ========================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowUpward as BuyIcon,
  ArrowDownward as SellIcon,
  SwapVert as TradeIcon,
} from '@mui/icons-material';
import {
  getApi,
  ENTITIES,
} from '../../services/datablokApi';
import type { Asset, Trade, CreateTradeInput } from '../../services/datablokApi';
import { formatUSD, formatQuantity } from '../../services/priceService';
import { recalculateHolding } from '../../services/holdingCalculator';

export default function TradesView() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<CreateTradeInput>({
    asset_id: '',
    trade_type: 'BUY',
    quantity: 0,
    price_per_unit: 0,
    total_value: 0,
    trade_date: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tradesRes, assetsRes] = await Promise.all([
        getApi().getAll<Trade>(ENTITIES.TRADES),
        getApi().getAll<Asset>(ENTITIES.ASSETS),
      ]);
      // Sort trades by date descending
      setTrades(tradesRes.sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()));
      setAssets(assetsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-calculate total value
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      total_value: Number((prev.quantity * prev.price_per_unit).toFixed(2)),
    }));
  }, [form.quantity, form.price_per_unit]);

  const handleOpenDialog = () => {
    setForm({
      asset_id: assets.length > 0 ? assets[0].id : '',
      trade_type: 'BUY',
      quantity: 0,
      price_per_unit: 0,
      total_value: 0,
      trade_date: new Date().toISOString().slice(0, 16),
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.asset_id || form.quantity <= 0 || form.price_per_unit <= 0) return;
    setSaving(true);
    try {
      await getApi().create<Trade>(ENTITIES.TRADES, {
        ...form,
        trade_date: new Date(form.trade_date).toISOString().replace('Z', '').split('.')[0],
      });
      // Auto-recalculate the holding for this asset from all trades
      await recalculateHolding(form.asset_id);
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trade');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      // Find the trade to know which asset to recalculate
      const tradeToDelete = trades.find((t) => t.id === deleteId);
      await getApi().remove(ENTITIES.TRADES, deleteId);
      // Auto-recalculate the holding for the affected asset
      if (tradeToDelete) {
        await recalculateHolding(tradeToDelete.asset_id);
      }
      setDeleteId(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trade');
    }
  };

  const getAssetName = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    return asset ? `${asset.symbol} (${asset.name})` : assetId;
  };

  const getAssetSymbol = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    return asset?.symbol || '???';
  };

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
            Trades
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Record and manage your buy/sell operations.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          disabled={assets.length === 0}
        >
          New Trade
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {assets.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <TradeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            No Assets Yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            You need to add assets before recording trades.
          </Typography>
          <Button variant="contained" href="/assets">
            Add Assets
          </Button>
        </Paper>
      ) : trades.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <TradeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            No Trades Yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Start recording your buy and sell operations.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
            Record First Trade
          </Button>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Asset</TableCell>
                  <TableCell align="center">Type</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price/Unit</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="center" width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(trade.trade_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(trade.trade_date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600} variant="body2">
                        {getAssetSymbol(trade.asset_id)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={trade.trade_type === 'BUY' ? <BuyIcon sx={{ fontSize: 16 }} /> : <SellIcon sx={{ fontSize: 16 }} />}
                        label={trade.trade_type}
                        size="small"
                        color={trade.trade_type === 'BUY' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{formatQuantity(Number(trade.quantity))}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{formatUSD(Number(trade.price_per_unit))}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatUSD(Number(trade.total_value))}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {trade.notes || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Delete trade">
                        <IconButton size="small" onClick={() => setDeleteId(trade.id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Summary */}
          <Box sx={{ p: 2, bgcolor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
            <Stack direction="row" spacing={4}>
              <Typography variant="body2" color="text.secondary">
                Total trades: <strong>{trades.length}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Buys: <strong>{trades.filter((t) => t.trade_type === 'BUY').length}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sells: <strong>{trades.filter((t) => t.trade_type === 'SELL').length}</strong>
              </Typography>
            </Stack>
          </Box>
        </Paper>
      )}

      {/* New Trade Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record New Trade</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              select
              label="Asset"
              value={form.asset_id}
              onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
              fullWidth
            >
              {assets.map((asset) => (
                <MenuItem key={asset.id} value={asset.id}>
                  {asset.symbol} — {asset.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Trade Type"
              value={form.trade_type}
              onChange={(e) => setForm({ ...form, trade_type: e.target.value as 'BUY' | 'SELL' })}
              fullWidth
            >
              <MenuItem value="BUY">BUY</MenuItem>
              <MenuItem value="SELL">SELL</MenuItem>
            </TextField>

            <TextField
              label="Quantity"
              type="number"
              value={form.quantity || ''}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              fullWidth
              inputProps={{ step: 'any', min: 0 }}
            />

            <TextField
              label="Price per Unit (USD)"
              type="number"
              value={form.price_per_unit || ''}
              onChange={(e) => setForm({ ...form, price_per_unit: Number(e.target.value) })}
              fullWidth
              inputProps={{ step: 'any', min: 0 }}
            />

            <TextField
              label="Total Value (USD)"
              type="number"
              value={form.total_value || ''}
              InputProps={{ readOnly: true }}
              fullWidth
              helperText="Auto-calculated: Quantity × Price"
            />

            <TextField
              label="Trade Date & Time"
              type="datetime-local"
              value={form.trade_date}
              onChange={(e) => setForm({ ...form, trade_date: e.target.value })}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.asset_id || form.quantity <= 0 || form.price_per_unit <= 0}
          >
            {saving ? <CircularProgress size={20} /> : 'Save Trade'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Trade</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this trade? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
