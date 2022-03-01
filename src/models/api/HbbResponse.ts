import Decimal from 'decimal.js';

export type HbbResponse = {
  // Amount of HBB staked (total staked in the staking pool)
  staked: Decimal;
  // Current price of HBB obtained from Orca
  price: Decimal;
  // Number of stakers (number of users in the staking pool)
  numberOfStakers: Decimal;
  // Total HBB issued (current supply from HBB mint account)
  issued: Decimal;
  // Number of current HBB holders
  numberOfHolders: number;
};
