import { SupportedToken } from '../../constants/tokens';

export type TokenResponse = {
  // Short token name
  name: SupportedToken;
  // Amount of token
  amount: number;
  // Price of token
  price: number;
};
