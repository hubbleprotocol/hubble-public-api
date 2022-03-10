import { PriceResponse } from './PriceResponse';
import { PercentileResponse } from './PercentileResponse';
import { DistributionBinResponse } from './DistributionBinsResponse';
import Decimal from 'decimal.js';

export type UsdhResponse = {
  // Total USDH issued (stablecoin borrowed)
  issued: Decimal;
  // Total in stability pool / stability provided (stablecoin deposited in stability pool)
  stabilityPool: Decimal;
  // Distribution of USDH in the stability pool
  stabilityPoolDistribution: PercentileResponse[];
  // Distribution of USDH sorted into bins
  stabilityPoolBins: DistributionBinResponse[];
  // Price and liquidity pool values obtained from Saber
  saber: PriceResponse;
  // Price and liquidity pool values obtained from Jupiter
  jupiter: PriceResponse;
};
