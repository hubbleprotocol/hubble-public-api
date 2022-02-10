
export type HbbResponse = {
  // Amount of HBB staked (total staked in the staking pool)
  staked: number;
  // Current price of HBB obtained from Orca
  price: number;
  // Number of stakers (number of users in the staking pool)
  numberOfStakers: number;
  // Total HBB issued (current supply from HBB mint account)
  issued: number;
  // Number of current HBB holders
  numberOfHolders: number;
};
