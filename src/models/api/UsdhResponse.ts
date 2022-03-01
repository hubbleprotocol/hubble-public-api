import { PriceResponse } from './PriceResponse';
import { PercentileResponse } from './PercentileResponse';
import Decimal from 'decimal.js';

export type UsdhResponse = {
  // Total USDH issued (stablecoin borrowed)
  issued: Decimal;
  // Total in stability pool / stability provided (stablecoin deposited in stability pool)
  stabilityPool: Decimal;
  // Distribution of USDH in the stability pool
  stabilityPoolDistribution: PercentileResponse[];
  // Price and liquidity pool values obtained from Saber
  saber: PriceResponse;
  // Price and liquidity pool values obtained from Jupiter
  jupiter: PriceResponse;
};
