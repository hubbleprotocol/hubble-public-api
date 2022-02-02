import { TimestampValueResponse } from './TimestampValueResponse';
import { LoansResponse } from './LoansResponse';

export type BorrowingResponse = {
  // Number of borrowers through history
  borrowersHistory: TimestampValueResponse[];
  // Number of currently active borrowers
  numberOfBorrowers: number;
  // Loans
  loans: LoansResponse;
  // Treasury amount
  treasury: number;
};
