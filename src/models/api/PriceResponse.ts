import Decimal from 'decimal.js';

export type PriceResponse = {
  // current price
  price: Decimal;
  // current supply in liquidity pool
  liquidityPool: Decimal;
};
