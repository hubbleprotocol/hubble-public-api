import { AccountInfo, Commitment, PublicKey } from '@solana/web3.js';
import { Market, MARKETS, Orderbook, TOKEN_MINTS } from '@project-serum/serum';
import { Web3Client } from '../web3/client';
import { MarketAccount } from '../../models/account';
import { STABLE_COINS } from '../../constants/tokens';
import { MarketInfo, SerumMarket } from '../../models/SerumMarket';
import { marketAccountParser } from './marketAccountParser';
import { MINT_TO_MARKET } from '../../models/marketOverrides';

export class SerumMarketService {
  private client: Web3Client;

  constructor(client: Web3Client) {
    this.client = client;
  }

  getMarkets = (
    mintAddresses: PublicKey[],
    commitment: Commitment = 'single'
  ): Promise<Record<string, SerumMarket>> => {
    const marketInfoByMarketAddress = this.getMarketsByMarketAddress(mintAddresses);
    const marketAccountAddresses = Array.from(marketInfoByMarketAddress.keys()).map((val) => new PublicKey(val));

    return this.client.connection
      .getMultipleAccountsInfo(marketAccountAddresses, commitment)
      .then((accounts) => {
        return marketAccountAddresses
          .filter((_, index) => accounts[index] !== null)
          .reduce((marketAccounts, key, index) => {
            const marketAccount = accounts[index];
            if (marketAccount !== null) {
              marketAccounts.set(key.toBase58(), marketAccountParser(key, marketAccount));
            }
            return marketAccounts;
          }, new Map<string, MarketAccount>());
      })
      .then((marketAccountsByAddress) => {
        const marketAccountsByAddressWithInfo = new Map<
          string,
          { marketAccount: MarketAccount; marketInfo: MarketInfo }
        >();
        marketAccountsByAddress.forEach((value, key) => {
          const marketInfo = marketInfoByMarketAddress.get(key);
          if (marketInfo !== undefined) {
            marketAccountsByAddressWithInfo.set(key, { marketInfo, marketAccount: value });
          }
        });
        return this.getMarketData(marketAccountsByAddressWithInfo, commitment);
      });
  };

  private getMarketsByMarketAddress = (mintAddresses: PublicKey[]): Map<string, MarketInfo> => {
    const marketsByMarketAddress = new Map<string, MarketInfo>();

    mintAddresses.forEach((mintAddress) => {
      const SERUM_TOKEN = TOKEN_MINTS.find((a) => a.address.equals(mintAddress));

      const marketAddressOverride = MINT_TO_MARKET[mintAddress.toBase58()];
      const marketInfo = MARKETS.filter((m) => !m.deprecated).find(
        (m) =>
          (SERUM_TOKEN && (m.name === `${SERUM_TOKEN.name}/USDC` || m.name === `${SERUM_TOKEN.name}/USDT`)) ||
          m.address.toBase58() === marketAddressOverride
      );

      if (marketInfo !== undefined) {
        marketsByMarketAddress.set(marketInfo.address.toBase58(), { ...marketInfo, mintAddress });
      }
    });

    return marketsByMarketAddress;
  };

  private getMarketData = (
    marketAccountsByAddress: Map<string, { marketAccount: MarketAccount; marketInfo: MarketInfo }>,
    commitment: Commitment
  ): Promise<Record<string, SerumMarket>> => {
    return this.getMarketSubaccounts(marketAccountsByAddress, commitment).then((marketInfoSubaccounts) => {
      const marketsByMint = {} as Record<string, SerumMarket>;
      marketAccountsByAddress.forEach((marketAccountAndInfo, key) => {
        const { marketAccount } = marketAccountAndInfo;

        const mintBase = marketAccountParser(
          marketAccount.data.baseMint,
          // @ts-ignore
          marketInfoSubaccounts.get(marketAccount.data.baseMint.toBase58())
        );

        const mintQuote = marketAccountParser(
          marketAccount.data.quoteMint,
          // @ts-ignore
          marketInfoSubaccounts.get(marketAccount.data.quoteMint.toBase58())
        );
        const mintBaseDecimals = mintBase?.data.decimals || 0;
        const mintQuoteDecimals = mintQuote?.data.decimals || 0;

        const market = new Market(
          marketAccount.data,
          mintBaseDecimals,
          mintQuoteDecimals,
          undefined,
          // @ts-ignore
          marketAccount.programId
        );

        const bidAccount = marketInfoSubaccounts.get(marketAccount.data.bids.toBase58());
        let bids;
        if (bidAccount) {
          bids = Orderbook.decode(market, bidAccount.data);
        }
        const askAccount = marketInfoSubaccounts.get(marketAccount.data.asks.toBase58());
        let asks;
        if (askAccount) {
          asks = Orderbook.decode(market, askAccount.data);
        }
        marketsByMint[marketAccountAndInfo.marketInfo.mintAddress.toBase58()] = {
          marketInfo: marketAccountAndInfo.marketInfo,
          midPrice: this.getMidPrice(key, bids, asks),
        };
      });
      return marketsByMint;
    });
  };

  private getMarketSubaccounts = (
    marketAccountsByAddress: Map<string, { marketAccount: MarketAccount; marketInfo: MarketInfo }>,
    commitment: Commitment
  ): Promise<Map<string, AccountInfo<Buffer>>> => {
    const toQuery = new Set<string>();
    marketAccountsByAddress.forEach((value) => {
      this.extractMarketSubaccounts(value.marketAccount).forEach((item) => toQuery.add(item.toBase58()));
    });
    return this.fetchMarketSubaccounts(
      Array.from(toQuery.values()).map((val) => new PublicKey(val)),
      commitment
    );
  };

  private fetchMarketSubaccounts = (
    subaccountAddresses: PublicKey[],
    commitment: Commitment
  ): Promise<Map<string, AccountInfo<Buffer>>> => {
    return this.client.connection.getMultipleAccountsInfo(subaccountAddresses, commitment).then((subaccounts) => {
      return subaccountAddresses
        .filter((_, index) => subaccounts[index] !== null)
        .reduce((marketSubaccounts, key, index) => {
          // @ts-ignore
          const marketSubaccount: AccountInfo<Buffer> = subaccounts[index];
          marketSubaccounts.set(key.toBase58(), marketSubaccount);
          return marketSubaccounts;
        }, new Map<string, AccountInfo<Buffer>>());
    });
  };

  private extractMarketSubaccounts = (marketInfoAccount: MarketAccount): PublicKey[] => {
    return [
      marketInfoAccount.data.baseMint,
      marketInfoAccount.data.quoteMint,
      marketInfoAccount.data.bids,
      marketInfoAccount.data.asks,
    ];
  };

  private getMidPrice = (mint: string, bids?: Orderbook, asks?: Orderbook): number => {
    const SERUM_TOKEN = TOKEN_MINTS.find((a) => a.address.toBase58() === mint);

    if (STABLE_COINS.has(SERUM_TOKEN?.name || '')) {
      return 1.0;
    }

    if (bids && asks) {
      return this.bbo(bids, asks);
    }

    return 0;
  };

  private bbo = (bidsBook: Orderbook, asksBook: Orderbook): number => {
    const bestBid = bidsBook.getL2(1);
    const bestAsk = asksBook.getL2(1);

    if (bestBid.length > 0 && bestAsk.length > 0) {
      return (bestBid[0][0] + bestAsk[0][0]) / 2.0;
    }

    return 0;
  };
}

export const createSerumMarketService = () => {
  const mainnetClient = new Web3Client('mainnet-beta'); //always connect to main net for serum
  return new SerumMarketService(mainnetClient);
};
