import { Web3Client } from '../web3/client';
import { Connection } from '@solana/web3.js';
import { getOrca, OrcaPoolConfig } from '@orca-so/sdk';
import Decimal from 'decimal.js';

export class OrcaPriceService {
  private readonly _connection: Connection;

  constructor(connection: Connection | undefined = undefined) {
    this._connection = connection ?? new Web3Client('mainnet-beta').connection;
  }

  getHbbPrice() {
    const orca = getOrca(this._connection);
    const hbbPool = orca.getPool(OrcaPoolConfig.HBB_USDC);
    return hbbPool.getQuote(hbbPool.getTokenA(), new Decimal(1));
  }
}
