import { PublicKey } from '@solana/web3.js';
import { Web3Client } from '../web3/client';
import { parsePriceData, PriceData } from '@pythnetwork/client';
import { SupportedToken } from '../../constants/tokens';

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

  constructor(client: Web3Client) {
    this.client = client;
  }

  private getPriceData = async (pricePublicKey: PublicKey): Promise<PriceData | undefined> => {
    const acc = await this.client.connection.getAccountInfo(pricePublicKey);
    return acc ? parsePriceData(acc?.data) : undefined;
  };

  getTokenPrices = async (tokens: TokenWithPubkey[]) => {
    const prices: PythPrice[] = [];
    for (const token of tokens) {
      const priceData = await this.getPriceData(token.pubkey);
      prices.push({ priceData: priceData, token: token.token });
    }
    return prices;
  };
}
