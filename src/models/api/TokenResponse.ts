import Decimal from 'decimal.js';

export type TokenResponse = {
  // Short token name
  name: string;
  // Amount of token
  amount: Decimal;
  // Price of token
  price: Decimal;
};
