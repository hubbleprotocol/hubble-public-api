import StabilityTokenMap from './StabilityTokenMap';

export type DepositSnapshot = {
  sum: StabilityTokenMap;
  product: number;
  scale: number;
  epoch: number;
  enabled: boolean;
};
