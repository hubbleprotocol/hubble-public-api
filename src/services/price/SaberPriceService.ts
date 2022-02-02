import { Connection, PublicKey } from '@solana/web3.js';
import { ENV, Web3Client } from '../web3/client';
import { calculateSwapPrice, loadExchangeInfoFromSwapAccount, StableSwap } from '@saberhq/stableswap-sdk';
import { getConfigByEnv } from '../hubble/hubbleConfig';
import { HubbleConfig } from '../../models/hubble/HubbleConfig';

export class SaberPriceService {
  private readonly _connection: Connection;
  private _config: HubbleConfig;

  constructor(connection: Connection | undefined = undefined, env: ENV = 'mainnet-beta') {
    this._connection = connection ?? new Web3Client('mainnet-beta').connection;
    this._config = getConfigByEnv(env);
    //https://app.saber.so/#/swap?from=USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX&to=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
  }

  async getUsdhPrice(): Promise<number> {
    // const ex = await loadExchangeInfoFromSwapAccount(
    //   this._connection,
    //   new PublicKey('SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ')
    // );
    // const stableSwap = await StableSwap.load(
    //   this._connection,
    //   new PublicKey('SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ')
    // );
    // console.log(
    //   (await Token.load(this._connection, new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')))?.info
    // );
    // const swap = calculateSwapPrice(ex!);
    // console.log(swap);
    // return swap.asNumber;
    return 0;
  }

  getUsdhLiquidity(): number {
    return 0;
  }
}
