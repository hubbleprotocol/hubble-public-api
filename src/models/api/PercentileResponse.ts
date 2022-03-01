import Decimal from 'decimal.js';

export type PercentileResponse = {
  value: Decimal;
  totalCount: number;
  percentile: number;
};
