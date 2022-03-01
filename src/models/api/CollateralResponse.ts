import { TokenResponse } from './TokenResponse';
import { PercentileResponse } from './PercentileResponse';
import Decimal from 'decimal.js';

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
  // Distribution of collateral ratio
  ratioDistribution: PercentileResponse[];
};
