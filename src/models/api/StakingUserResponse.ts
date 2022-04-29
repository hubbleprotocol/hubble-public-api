import Decimal from 'decimal.js';
import { PublicKey } from '@solana/web3.js';

export type StakingUserResponse = {
  user: PublicKey;
  staked: Decimal;
};
