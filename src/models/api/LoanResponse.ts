import Decimal from 'decimal.js';
import { CollateralTotals } from '@hubbleprotocol/hubble-sdk';
import { PublicKey } from '@solana/web3.js';

export type LoanResponse = {
  // USDH (stablecoin) debt
  usdhDebt: Decimal;
  // Total Collateral value
  totalCollateralValue: Decimal;
  // Collateral ratio percentage in decimal representation (50% = 0.5)
  collateralRatio: Decimal;
  // Loan to value ratio percentage in decimal representation (50% = 0.5)
  loanToValue: Decimal;
  // Collateral used for the loan
  collateral: CollateralTotals[];
  // Loan owner's public key
  owner: PublicKey;
  // Loan version
  version: number;
  // Loan status
  status: number;
  // Loan user ID
  userId: Decimal;
  // Loan public key
  metadataPk: PublicKey;
  // Borrowing market state public key
  borrowingMarketState: PublicKey;
};

export type LoanResponseWithJson = {
  // USDH (stablecoin) debt
  usdhDebt: Decimal;
  // Total Collateral value
  totalCollateralValue: Decimal;
  // Collateral ratio percentage in decimal representation (50% = 0.5)
  collateralRatio: Decimal;
  // Loan to value ratio percentage in decimal representation (50% = 0.5)
  loanToValue: Decimal;
  // Collateral used for the loan
  collateral: CollateralTotals[];
  // Loan owner's public key
  owner: PublicKey;
  // Loan version
  version: number;
  // Loan status
  status: number;
  // Loan user ID
  userId: Decimal;
  // Loan public key
  metadataPk: PublicKey;
  // Borrowing market state public key
  borrowingMarketState: PublicKey;
  // Raw JSON RPC response
  jsonResponse: string;
};
