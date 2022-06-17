import Decimal from 'decimal.js';

export type TokenCollateral = {
  deposited: Decimal;
  inactive: Decimal;
  price: Decimal;
  token: string;
};

export default TokenCollateral;
