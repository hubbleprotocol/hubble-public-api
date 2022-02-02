import { TimestampValueResponse } from './TimestampValueResponse';
import { PriceResponse } from './PriceResponse';
import { PercentileResponse } from './PercentileResponse';

export type UsdhResponse = {
  // Total USDH issued (stablecoin borrowed)
  issued: number;
  // Total in stability pool / stability provided (stablecoin deposited in stability pool)
  stabilityPool: number;
  // Total USDH issued through history
  history: TimestampValueResponse[];
  // Distribution of USDH in the stability pool
  stabilityPoolDistribution: PercentileResponse[];
  // Price and liquidity pool values obtained from Saber
  saber: PriceResponse;
  // Price and liquidity pool values obtained from Mercurial
  mercurial: PriceResponse;
};
