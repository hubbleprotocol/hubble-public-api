import { PublicKey } from '@solana/web3.js';
import { Orderbook } from '@project-serum/serum';
import { MarketAccount } from './account';

export interface SerumMarket {
  marketInfo: MarketInfo;

  // 1st query
  marketAccount?: MarketAccount;

  // 2nd query
  mintBase?: MarketAccount;
  mintQuote?: MarketAccount;
  bids?: Orderbook;
  asks?: Orderbook;
  eventQueue?: MarketAccount;

  swap?: {
    dailyVolume: number;
  };

  midPrice?: number;
}

export interface MarketInfo {
  mintAddress: PublicKey;
  address: PublicKey;
  name: string;
  programId: PublicKey;
  deprecated: boolean;
}
