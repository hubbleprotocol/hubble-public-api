export interface EligibleLoansResponse {
  /**
   * List of user metadata pubkeys (loans) that are eligible for Lido rewards
   */
  eligibleLoans: string[];
}

export default EligibleLoansResponse;
