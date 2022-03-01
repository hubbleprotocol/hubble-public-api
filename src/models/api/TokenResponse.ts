import { SupportedToken } from '../../constants/tokens';
import Decimal from 'decimal.js';

export type TokenResponse = {
  // Short token name
  name: SupportedToken;
  // Amount of token
  amount: Decimal;
  // Price of token
  price: Decimal;
};
