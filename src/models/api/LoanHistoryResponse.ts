import { LoanResponse } from './LoanResponse';

export type LoanHistoryResponse = {
  epoch: number;
  loans: LoanResponse[];
};
