import Decimal from 'decimal.js';
import { CollateralToken } from '../../constants/tokens';

export type TokenCollateral = {
  deposited: Decimal;
  inactive: Decimal;
  price: Decimal;
  token: CollateralToken;
};

export default TokenCollateral;
