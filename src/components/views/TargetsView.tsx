// ========================================================================
// TARGETS VIEW
// ========================================================================
// Set and manage target portfolio allocation percentages.
// ========================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PieChart as PieChartIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import {
  getApi,
  ENTITIES,
} from '../../services/datablokApi';
import type { Asset, TargetAllocation, CreateTargetAllocationInput } from '../../services/datablokApi';

// Asset colors
const ASSET_COLORS: Record<string, string> = {
  BTC: '#F7931A', ETH: '#627EEA', SOL: '#9945FF', ADA: '#0033AD',
  DOT: '#E6007A', AVAX: '#E84142', LINK: '#2A5ADA', XRP: '#00AAE4',
  DOGE: '#C3A634', BNB: '#F3BA2F', CASH: '#10b981', USD: '#10b981',
  USDT: '#26A17B', USDC: '#2775CA', MATIC: '#8247E5',
};

function getAssetColor(symbol: string): string {
  return ASSET_COLORS[symbol.toUpperCase()] || '#6b7280';
}

export default function TargetsView() {
  const [targets, setTargets] = useState<TargetAllocation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateTargetAllocationInput>({
    asset_id: '',
    target_percentage: 0,
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let [assetsRes, targetsRes] = await Promise.all([
        getApi().getAll<Asset>(ENTITIES.ASSETS),
        getApi().getAll<TargetAllocation>(ENTITIES.TARGET_ALLOCATIONS),
      ]);

      // --- Ensure Cash asset always exists ---
      let cashAsset = assetsRes.find(
        (a) => a.asset_type === 'cash' || a.symbol.toUpperCase() === 'USD'
      );
      if (!cashAsset) {
        cashAsset = await getApi().create<Asset>(ENTITIES.ASSETS, {
          symbol: 'USD',
          name: 'US Dollar (Cash)',
          asset_type: 'cash',
          coingecko_id: '',
        });
        assetsRes = [...assetsRes, cashAsset];
      }

      // --- Ensure Cash target allocation always exists ---
      const cashTarget = targetsRes.find((t) => t.asset_id === cashAsset!.id);
      if (!cashTarget) {
        // Default cash to whatever % is remaining, minimum 0
        const othersTotal = targetsRes.reduce((s, t) => s + Number(t.target_percentage), 0);
        const cashPct = Math.max(0, 100 - othersTotal);
        const newTarget = await getApi().create<TargetAllocation>(
          ENTITIES.TARGET_ALLOCATIONS,
          { asset_id: cashAsset!.id, target_percentage: cashPct }
        );
        targetsRes = [...targetsRes, newTarget];
      }

      setAssets(assetsRes);
      setTargets(targetsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Total allocation percentage
  const totalAllocation = useMemo(
    () => targets.reduce((sum, t) => sum + Number(t.target_percentage), 0),
    [targets]
  );

  const isValid = Math.abs(totalAllocation - 100) < 0.01;

  // Assets that don't have a target yet
  const availableAssets = useMemo(() => {
    const targetAssetIds = new Set(targets.map((t) => t.asset_id));
    return assets.filter((a) => !targetAssetIds.has(a.id));
  }, [assets, targets]);

  const getAsset = (assetId: string) => assets.find((a) => a.id === assetId);

  // Inline editing state
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<number>(0);
  const [inlineSaving, setInlineSaving] = useState(false);

  const handleInlineEdit = (target: TargetAllocation) => {
    setInlineEditId(target.id);
    setInlineEditValue(Number(target.target_percentage));
  };

  const handleInlineSave = async (targetId: string) => {
    // Validate against budget
    const othersTotal = targets
      .filter((t) => t.id !== targetId)
      .reduce((sum, t) => sum + Number(t.target_percentage), 0);
    if (inlineEditValue + othersTotal > 100.01) {
      setError(`Cannot exceed 100%. Max for this asset: ${(100 - othersTotal).toFixed(1)}%`);
      return;
    }
    setInlineSaving(true);
    try {
      await getApi().update<TargetAllocation>(ENTITIES.TARGET_ALLOCATIONS, targetId, {
        target_percentage: inlineEditValue,
      });
      setInlineEditId(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update target');
    } finally {
      setInlineSaving(false);
    }
  };

  const handleInlineCancel = () => {
    setInlineEditId(null);
  };

  const handleAdd = () => {
    if (availableAssets.length === 0) return;
    setEditingId(null);
    setForm({
      asset_id: availableAssets[0].id,
      target_percentage: 0,
    });
    setDialogOpen(true);
  };

  const handleEdit = (target: TargetAllocation) => {
    setEditingId(target.id);
    setForm({
      asset_id: target.asset_id,
      target_percentage: Number(target.target_percentage),
    });
    setDialogOpen(true);
  };

  // Calculate how much % is available for the current dialog
  const remainingBudget = useMemo(() => {
    if (editingId) {
      // When editing, exclude the current target's existing value from the total
      const currentTarget = targets.find((t) => t.id === editingId);
      const othersTotal = targets
        .filter((t) => t.id !== editingId)
        .reduce((sum, t) => sum + Number(t.target_percentage), 0);
      return 100 - othersTotal;
    }
    return 100 - totalAllocation;
  }, [targets, totalAllocation, editingId]);

  const wouldExceed = form.target_percentage > remainingBudget + 0.01;

  const handleSave = async () => {
    if (!form.asset_id || form.target_percentage <= 0) return;
    if (wouldExceed) {
      setError(`Cannot exceed 100%. Maximum allowed for this asset: ${remainingBudget.toFixed(1)}%`);
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await getApi().update<TargetAllocation>(ENTITIES.TARGET_ALLOCATIONS, editingId, {
          target_percentage: form.target_percentage,
        });
      } else {
        await getApi().create<TargetAllocation>(ENTITIES.TARGET_ALLOCATIONS, form);
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save target');
    } finally {
      setSaving(false);
    }
  };

  // Check if a target is for the Cash asset (cannot be deleted)
  const isCashTarget = useCallback(
    (targetId: string) => {
      const target = targets.find((t) => t.id === targetId);
      if (!target) return false;
      const asset = assets.find((a) => a.id === target.asset_id);
      return asset?.asset_type === 'cash' || asset?.symbol.toUpperCase() === 'USD';
    },
    [targets, assets]
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    if (isCashTarget(deleteId)) {
      setError('Cash allocation cannot be removed — it is required for rebalancing.');
      setDeleteId(null);
      return;
    }
    try {
      await getApi().remove(ENTITIES.TARGET_ALLOCATIONS, deleteId);
      setDeleteId(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete target');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Target Allocation
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Set your ideal portfolio distribution. Totals should add up to 100%.
          </Typography>
        </Box>
        {availableAssets.length > 0 ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Add Target
          </Button>
        ) : targets.length > 0 ? (
          <Chip label="All assets have targets" color="success" variant="outlined" />
        ) : null}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Total Allocation Banner */}
      {targets.length > 0 && (
        <Paper sx={{ p: 2.5, mb: 3, bgcolor: isValid ? '#f0fdf4' : '#fef2f2' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {isValid ? (
              <CheckIcon sx={{ color: '#10b981' }} />
            ) : (
              <WarningIcon sx={{ color: '#ef4444' }} />
            )}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body1" fontWeight={600}>
                Total Allocation: {totalAllocation.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(totalAllocation, 100)}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: '#e5e7eb',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: isValid ? '#10b981' : totalAllocation > 100 ? '#ef4444' : '#f59e0b',
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
            <Chip
              label={isValid ? 'Valid' : totalAllocation > 100 ? 'Over 100%' : `${(100 - totalAllocation).toFixed(1)}% remaining`}
              color={isValid ? 'success' : 'error'}
              variant="outlined"
              size="small"
            />
          </Stack>
        </Paper>
      )}

      {assets.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <PieChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            No Assets Yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Add assets first, then set your target allocations.
          </Typography>
          <Button variant="contained" href="/assets">
            Add Assets
          </Button>
        </Paper>
      ) : targets.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <PieChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            No Target Allocations
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Define your ideal portfolio breakdown to get rebalancing recommendations.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            Set First Target
          </Button>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Asset</TableCell>
                  <TableCell>Allocation</TableCell>
                  <TableCell align="right" sx={{ minWidth: 160 }}>Target %</TableCell>
                  <TableCell align="center" width={120}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {targets.map((target) => {
                  const asset = getAsset(target.asset_id);
                  const pct = Number(target.target_percentage);
                  const color = asset ? getAssetColor(asset.symbol) : '#6b7280';
                  const isEditing = inlineEditId === target.id;
                  const isCash = asset?.asset_type === 'cash' || asset?.symbol.toUpperCase() === 'USD';

                  return (
                    <TableRow
                      key={target.id}
                      hover
                      sx={{
                        bgcolor: isEditing ? '#f0f9ff' : undefined,
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: color,
                            }}
                          />
                          <Box>
                            <Typography fontWeight={600} variant="body2">
                              {asset?.symbol || '???'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {asset?.name || 'Unknown'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
                          <LinearProgress
                            variant="determinate"
                            value={isEditing ? inlineEditValue : pct}
                            sx={{
                              flexGrow: 1,
                              height: 8,
                              borderRadius: 4,
                              bgcolor: '#e5e7eb',
                              '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {isEditing ? (
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                            <TextField
                              type="number"
                              size="small"
                              value={inlineEditValue || ''}
                              onChange={(e) => setInlineEditValue(Math.max(0, Number(e.target.value)))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(target.id);
                                if (e.key === 'Escape') handleInlineCancel();
                              }}
                              autoFocus
                              sx={{ width: 80 }}
                              inputProps={{ step: 0.1, min: 0, max: 100 }}
                            />
                            <Typography variant="body2" color="text.secondary">%</Typography>
                          </Stack>
                        ) : (
                          <Tooltip title="Click to edit" arrow placement="left">
                            <Box
                              onClick={() => handleInlineEdit(target)}
                              sx={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                border: '1px dashed transparent',
                                '&:hover': {
                                  bgcolor: '#f0f4ff',
                                  border: '1px dashed #3b82f6',
                                },
                                transition: 'all 0.15s',
                              }}
                            >
                              <Typography variant="body1" fontWeight={700}>
                                {pct.toFixed(1)}%
                              </Typography>
                              <EditIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 0.5 }} />
                            </Box>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {isEditing ? (
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleInlineSave(target.id)}
                              disabled={inlineSaving || inlineEditValue <= 0}
                              sx={{ minWidth: 0, px: 1.5, fontSize: '0.75rem' }}
                            >
                              {inlineSaving ? <CircularProgress size={16} /> : 'Save'}
                            </Button>
                            <Button
                              size="small"
                              onClick={handleInlineCancel}
                              sx={{ minWidth: 0, px: 1, fontSize: '0.75rem' }}
                            >
                              Cancel
                            </Button>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Edit target %">
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                                onClick={() => handleInlineEdit(target)}
                                sx={{ minWidth: 0, px: 1.5, fontSize: '0.75rem', textTransform: 'none' }}
                              >
                                Edit
                              </Button>
                            </Tooltip>
                            {!isCash ? (
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => setDeleteId(target.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Cash is required">
                                <span>
                                  <IconButton size="small" disabled>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {availableAssets.length > 0 && (
            <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
              <Button size="small" startIcon={<AddIcon />} onClick={handleAdd}>
                Add another target ({availableAssets.length} assets available)
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Target Allocation' : 'Add Target Allocation'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {!editingId && (
              <TextField
                select
                label="Asset"
                value={form.asset_id}
                onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                fullWidth
              >
                {availableAssets.map((asset) => (
                  <MenuItem key={asset.id} value={asset.id}>
                    {asset.symbol} — {asset.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Target Percentage (%)"
              type="number"
              value={form.target_percentage || ''}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                setForm({ ...form, target_percentage: val });
              }}
              fullWidth
              inputProps={{ step: 0.1, min: 0, max: remainingBudget }}
              error={wouldExceed}
              helperText={
                wouldExceed
                  ? `Exceeds 100%! Max available: ${remainingBudget.toFixed(1)}%`
                  : `Available: ${remainingBudget.toFixed(1)}%. ${editingId ? `Current value: ${targets.find(t => t.id === editingId)?.target_percentage}%` : `Adding ${form.target_percentage}% → total ${(totalAllocation + form.target_percentage).toFixed(1)}%`}`
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || form.target_percentage <= 0 || wouldExceed}
          >
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Remove Target</DialogTitle>
        <DialogContent>
          <Typography>Remove this target allocation?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
