import { CollateralResponse } from './CollateralResponse';
import { BorrowingResponse } from './BorrowingResponse';
import { UsdhResponse } from './UsdhResponse';
import { HbbResponse } from './HbbResponse';
import Decimal from 'decimal.js';

// Response returned from the /metrics endpoint
export type MetricsResponse = {
  // Revenue generated (total distributed rewards + rewards not yet claimed)
  revenue: Decimal;

  // Collateral stats
  collateral: CollateralResponse;

  // Borrowing market stats
  borrowing: BorrowingResponse;

  // Stablecoin (USDH) stats
  usdh: UsdhResponse;

  // HBB stats
  hbb: HbbResponse;

  // Circulating supply value - total issued HBB * HBB price
  circulatingSupplyValue: Decimal;

  // Total Value Locked (TVL) => total staked HBB + total collateral + total USDH
  totalValueLocked: Decimal;

  // Epoch timestamp of when these metrics have been fetched (we keep them in cache for 60s)
  timestamp: number;
};
