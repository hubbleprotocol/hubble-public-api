import { PercentileResponse } from './PercentileResponse';
import Decimal from 'decimal.js';

export type LoansResponse = {
  // Number of current loans
  total: Decimal;
  // Loan amount distribution
  distribution: PercentileResponse[];
  // Largest loan in the borrowing market
  max: Decimal;
  // Smallest loan in the borrowing market
  min: Decimal;
  // Average loan value in the borrowing market
  average: Decimal;
  // Median loan value in the borrowing market
  median: Decimal;
};
