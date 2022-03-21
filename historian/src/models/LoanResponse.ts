import { CollateralTotals } from '@hubbleprotocol/hubble-sdk';

export type LoanResponse = {
  // USDH (stablecoin) debt
  usdhDebt: string;
  // Total Collateral value
  totalCollateralValue: string;
  // Collateral ratio percentage in decimal representation (50% = 0.5)
  collateralRatio: string;
  // Loan to value ratio percentage in decimal representation (50% = 0.5)
  loanToValue: string;
  // Collateral used for the loan
  collateral: CollateralTotals[];
  // Loan owner's public key
  owner: string;
  // Loan version
  version: number;
  // Loan status
  status: number;
  // Loan user ID
  userId: string;
  // Loan public key
  metadataPk: string;
  // Borrowing market state public key
  borrowingMarketState: string;
};
