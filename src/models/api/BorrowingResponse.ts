import { LoansResponse } from './LoansResponse';

export type BorrowingResponse = {
  // Number of currently active borrowers
  numberOfBorrowers: number;
  // Loans
  loans: LoansResponse;
  // Treasury amount
  treasury: number;
};
