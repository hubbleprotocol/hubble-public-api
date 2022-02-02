import { TimestampValueResponse } from './TimestampValueResponse';
import { PercentileResponse } from './PercentileResponse';

export type LoansResponse = {
  // Number of current loans
  total: number;
  // Number of loans through history
  history: TimestampValueResponse[];
  // Loan amount distribution
  distribution: PercentileResponse[];
  // Largest loan in the borrowing market
  max: number;
  // Smallest loan in the borrowing market
  min: number;
  // Average loan value in the borrowing market
  average: number;
  // Median loan value in the borrowing market
  median: number;
};
