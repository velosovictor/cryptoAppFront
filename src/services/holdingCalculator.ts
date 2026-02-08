// ========================================================================
// HOLDING CALCULATOR
// ========================================================================
// Recalculates holding (quantity, average_buy_price) from trade history.
// Holdings are byproducts of trades — not manually editable.
// ========================================================================

import { getApi, ENTITIES } from './datablokApi';
import type { Trade, Holding } from './datablokApi';

/**
 * Recalculate the holding for a given asset from all its trades.
 * Creates or updates the holding record in the database.
 *
 * Logic:
 *   - BUY: adds quantity, recalculates weighted average price
 *   - SELL: subtracts quantity (avg price stays the same)
 *   - If quantity drops to 0 or below, holding is set to 0 with avg price 0
 */
export async function recalculateHolding(assetId: string): Promise<void> {
  // 1. Fetch all trades for this asset
  const allTrades = await getApi().getAll<Trade>(ENTITIES.TRADES);
  const assetTrades = allTrades
    .filter((t) => t.asset_id === assetId)
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  // 2. Compute quantity and weighted avg buy price from trade history
  let quantity = 0;
  let totalCost = 0; // running total cost of current holdings

  for (const trade of assetTrades) {
    const qty = Number(trade.quantity);
    const price = Number(trade.price_per_unit);

    if (trade.trade_type === 'BUY') {
      totalCost += qty * price;
      quantity += qty;
    } else {
      // SELL — reduce quantity, reduce totalCost proportionally
      if (quantity > 0) {
        const avgCost = totalCost / quantity;
        quantity -= qty;
        if (quantity < 0) quantity = 0;
        totalCost = quantity * avgCost;
      }
    }
  }

  const averageBuyPrice = quantity > 0 ? totalCost / quantity : 0;

  // 3. Find existing holding for this asset
  const allHoldings = await getApi().getAll<Holding>(ENTITIES.HOLDINGS);
  const existing = allHoldings.find((h) => h.asset_id === assetId);

  // 4. Create or update holding
  if (existing) {
    await getApi().update<Holding>(ENTITIES.HOLDINGS, existing.id, {
      quantity: Number(quantity.toFixed(8)),
      average_buy_price: Number(averageBuyPrice.toFixed(2)),
    });
  } else if (quantity > 0) {
    await getApi().create<Holding>(ENTITIES.HOLDINGS, {
      asset_id: assetId,
      quantity: Number(quantity.toFixed(8)),
      average_buy_price: Number(averageBuyPrice.toFixed(2)),
    });
  }
}
