import Decimal from 'decimal.js';

export interface LidoResponse {
  apr: Decimal;
  apy: Decimal;
  eligibleLoans: Decimal;
  totalInvestment: Decimal;
  totalReturn: Decimal;
}
