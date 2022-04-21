import Decimal from 'decimal.js';

export type StakingResponse = {
  name: string;
  apr: Decimal;
  apy: Decimal;
  tvl: Decimal;
};
