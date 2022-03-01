import { LoansResponse } from './LoansResponse';
import Decimal from 'decimal.js';

export type BorrowingResponse = {
  // Number of currently active borrowers
  numberOfBorrowers: number;
  // Loans
  loans: LoansResponse;
  // Treasury amount
  treasury: Decimal;
};
