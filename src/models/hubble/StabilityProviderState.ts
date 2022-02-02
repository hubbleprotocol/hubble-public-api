import { PublicKey } from '@solana/web3.js';
import StabilityTokenMap from './StabilityTokenMap';
import { DepositSnapshot } from './DepositSnapshot';

export type StabilityProviderState = {
  version: number;
  stabilityPoolState: PublicKey;
  owner: PublicKey;
  userId: number;
  depositedStablecoin: number;
  userDepositSnapshot: DepositSnapshot;
  cumulativeGainsPerUser: StabilityTokenMap;
  pendingGainsPerUser: StabilityTokenMap;
};
