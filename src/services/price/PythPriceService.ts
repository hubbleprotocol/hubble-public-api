import { PublicKey } from '@solana/web3.js';
import { Web3Client } from '../web3/client';
import { parsePriceData, PriceData } from '@pythnetwork/client';
import { CollateralToken, CollateralTokens } from '../../constants/tokens';
import { HubbleConfig } from '@hubbleprotocol/hubble-config';
import { getPythTokens } from '../../utils/tokenUtils';

export type PythPrice = {
  token: CollateralToken;
  priceData: PriceData | undefined;
};

export type TokenWithPubkey = {
  token: CollateralToken;
  pubkey: PublicKey;
};

export class PythPriceService {
  private client: Web3Client;
  private _config: HubbleConfig;

  constructor(client: Web3Client, config: HubbleConfig) {
    this.client = client;
    this._config = config;
  }

  private getTokenFromPriceData = (priceData: PriceData): CollateralToken => {
    switch (priceData.productAccountKey.toBase58()) {
      case this._config.borrowing.accounts.pyth?.btcProductInfo!.toBase58():
        return CollateralTokens.find((x) => x.name === 'BTC')!;
      case this._config.borrowing.accounts.pyth?.ethProductInfo!.toBase58():
        return CollateralTokens.find((x) => x.name === 'ETH')!;
      case this._config.borrowing.accounts.pyth?.fttProductInfo!.toBase58():
        return CollateralTokens.find((x) => x.name === 'FTT')!;
      case this._config.borrowing.accounts.pyth?.msolProductInfo!.toBase58():
        return CollateralTokens.find((x) => x.name === 'MSOL')!;
      case this._config.borrowing.accounts.pyth?.rayProductInfo!.toBase58():
        return CollateralTokens.find((x) => x.name === 'RAY')!;
      case this._config.borrowing.accounts.pyth?.solProductInfo!.toBase58():
        return CollateralTokens.find((x) => x.name === 'SOL')!;
      case this._config.borrowing.accounts.pyth?.srmProductInfo!.toBase58():
        return CollateralTokens.find((x) => x.name === 'SRM')!;
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
