import { PercentileResponse } from './PercentileResponse';
import Decimal from 'decimal.js';
import { DistributionBinResponse } from './DistributionBinsResponse';

export type LoansResponse = {
  // Number of current loans
  total: number;
  // Loan amount distribution
  distribution: PercentileResponse[];
  // Distribution of loan amounts sorted into bins
  bins: DistributionBinResponse[];
  // Largest loan in the borrowing market
  max: Decimal;
  // Smallest loan in the borrowing market
  min: Decimal;
  // Average loan value in the borrowing market
  average: Decimal;
  // Median loan value in the borrowing market
  median: Decimal;
};
