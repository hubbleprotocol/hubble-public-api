import { TokenResponse } from './TokenResponse';
import { PercentileResponse } from './PercentileResponse';

export type CollateralResponse = {
  // Total collateral value (deposited + inactive)
  total: number;
  // Total collateral ratio in decimal representation (e.g. 1.8 => 180% ratio)
  collateralRatio: number;
  // Deposited collateral value
  deposited: number;
  // Inactive collateral value
  inactive: number;
  // Deposited collateral by token
  depositedTokens: TokenResponse[];
  // Distribution of collateral ratio
  ratioDistribution: PercentileResponse[];
};
