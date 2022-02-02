import { SupportedToken } from '../../constants/tokens';

export type CollateralTotals = {
  deposited: number;
  inactive: number;
  price: number;
  token: SupportedToken;
};
