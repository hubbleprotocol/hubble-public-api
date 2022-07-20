import { EligibleLoan } from '../../services/database';

export interface EligibleLoansResponse {
  /**
   * List of user metadata pubkeys (loans) that are eligible for Lido rewards
   */
  eligibleLoans: EligibleLoan[];
}

export default EligibleLoansResponse;
