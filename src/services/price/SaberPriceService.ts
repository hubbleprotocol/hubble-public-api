import { Connection } from '@solana/web3.js';
import { ENV, Web3Client } from '../web3/client';
import { calculateSwapPrice, loadExchangeInfoFromSwapAccount } from '@saberhq/stableswap-sdk';
import { PriceResponse } from '../../models/api/PriceResponse';
import { getConfigByCluster, HubbleConfig } from '@hubbleprotocol/hubble-config';

export class SaberPriceService {
  private readonly _connection: Connection;
  private _config: HubbleConfig;

  constructor(connection: Connection | undefined = undefined, env: ENV = 'mainnet-beta') {
    this._connection = connection ?? new Web3Client('mainnet-beta').connection;
    this._config = getConfigByCluster(env);
  }

  async getStats(): Promise<PriceResponse> {
    const ex = await loadExchangeInfoFromSwapAccount(
      this._connection,
      this._config.borrowing.accounts.saber.stablecoinSwap
    );
    if (!ex) {
      throw Error(
        `Could not load exchange info from swap account ${this._config.borrowing.accounts.saber.stablecoinSwap.toString()}`
      );
    }
    const swap = calculateSwapPrice(ex);
    return { price: swap.asNumber, liquidityPool: ex.lpTotalSupply.asNumber };
  }
}
