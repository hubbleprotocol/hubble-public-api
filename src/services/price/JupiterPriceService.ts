import { Connection, PublicKey } from '@solana/web3.js';
import { ENV, Web3Client } from '../web3/client';
import { PriceResponse } from '../../models/api/PriceResponse';
import { Jupiter } from '@jup-ag/core';
import { DECIMALS_USDC, STABLECOIN_DECIMALS } from '../../constants/math';
import { getConfigByCluster, HubbleConfig } from '@hubbleprotocol/hubble-config';

export class JupiterPriceService {
  private readonly _connection: Connection;
  private readonly _config: HubbleConfig;

  constructor(connection: Connection | undefined = undefined, env: ENV = 'mainnet-beta') {
    this._connection = connection ?? new Web3Client('mainnet-beta').connection;
    this._config = getConfigByCluster(env);
  }

  async getStats(): Promise<PriceResponse> {
    const jupiter = await Jupiter.load({
      connection: this._connection,
      cluster: 'mainnet-beta',
      user: this._config.borrowing.programId,
    });
    const routes = await jupiter.computeRoutes({
      inputMint: new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX'),
      outputMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      inputAmount: 1 * DECIMALS_USDC, // 1000000 => 1 USDC if inputToken.address is USDC mint
      slippage: 0,
    });
    return {
      price: routes.routesInfos[0].outAmount / STABLECOIN_DECIMALS,
      liquidityPool: 0, // jupiter does not track LP supply
    };
  }
}
