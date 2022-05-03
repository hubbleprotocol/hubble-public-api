import { PublicKey } from '@solana/web3.js';
import { Web3Client } from '../web3/client';
import { parsePriceData, PriceData } from '@pythnetwork/client';
import { SupportedToken } from '../../constants/tokens';
import { HubbleConfig } from '@hubbleprotocol/hubble-config';
import { getPythTokens } from '../../utils/tokenUtils';

export type PythPrice = {
  token: SupportedToken;
  priceData: PriceData | undefined;
};

export type TokenWithPubkey = {
  token: SupportedToken;
  pubkey: PublicKey;
};

export class PythPriceService {
  private client: Web3Client;
  private _config: HubbleConfig;

  constructor(client: Web3Client, config: HubbleConfig) {
    this.client = client;
    this._config = config;
  }

  private getTokenFromPriceData = (priceData: PriceData): SupportedToken => {
    switch (priceData.productAccountKey.toBase58()) {
      case this._config.borrowing.accounts.pyth?.btcProductInfo!.toBase58():
        return 'BTC';
      case this._config.borrowing.accounts.pyth?.ethProductInfo!.toBase58():
        return 'ETH';
      case this._config.borrowing.accounts.pyth?.fttProductInfo!.toBase58():
        return 'FTT';
      case this._config.borrowing.accounts.pyth?.msolProductInfo!.toBase58():
        return 'mSOL';
      case this._config.borrowing.accounts.pyth?.rayProductInfo!.toBase58():
        return 'RAY';
      case this._config.borrowing.accounts.pyth?.solProductInfo!.toBase58():
        return 'SOL';
      case this._config.borrowing.accounts.pyth?.srmProductInfo!.toBase58():
        return 'SRM';
      default:
        throw Error('not supported price data token');
    }
  };

  getTokenPrices = async () => {
    const tokens = getPythTokens(this._config);
    const prices: PythPrice[] = [];
    const accounts = await this.client.connection.getMultipleAccountsInfo(tokens.map((x) => x.pubkey));
    for (const account of accounts) {
      const priceData = parsePriceData(account?.data!);
      const token = this.getTokenFromPriceData(priceData);
      prices.push({ priceData, token });
    }
    return prices;
  };
}
