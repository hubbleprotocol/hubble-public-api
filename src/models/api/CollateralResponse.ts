import { TokenResponse } from './TokenResponse';
import { PercentileResponse } from './PercentileResponse';
import Decimal from 'decimal.js';
import { DistributionBinResponse } from './DistributionBinsResponse';

export type CollateralResponse = {
  // Total collateral value (deposited + inactive)
  total: Decimal;
  // Total collateral ratio in decimal representation (e.g. 1.8 => 180% ratio)
  collateralRatio: Decimal;
  // Deposited collateral value
  deposited: Decimal;
  // Inactive collateral value
  inactive: Decimal;
  // Deposited collateral by token
  depositedTokens: TokenResponse[];
  // Distribution of collateral ratio as a histogram
  ratioDistribution: PercentileResponse[];
  // Distribution of collateral ratio sorted into bins
  ratioBins: DistributionBinResponse[];
  // Distribution of loan-to-value ratio sorted into bins
  ltvBins: DistributionBinResponse[];
};
