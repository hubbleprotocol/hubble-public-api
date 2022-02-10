import { clusterApiUrl, Connection } from '@solana/web3.js';
import { ENV as ChainID } from '@solana/spl-token-registry/dist/main/lib/tokenlist';
import { getEnvOrThrow } from '../../utils/envUtils';

export type ENV = 'mainnet-beta' | 'testnet' | 'devnet' | 'localnet';

export const ENDPOINTS = [
  {
    name: 'mainnet-beta' as ENV,
    endpoint: getEnvOrThrow('MAINNET_ENDPOINT'), // we use private node for mainnet
    chainID: ChainID.MainnetBeta,
  },
  {
    name: 'testnet' as ENV,
    endpoint: clusterApiUrl('testnet'),
    chainID: ChainID.Testnet,
  },
  {
    name: 'devnet' as ENV,
    endpoint: getEnvOrThrow('DEVNET_ENDPOINT'), // we use private node for devnet
    chainID: ChainID.Devnet,
  },
  {
    name: 'localnet' as ENV,
    endpoint: 'http://127.0.0.1:8899',
    chainID: ChainID.Devnet,
  },
];

export class Web3Client {
  private readonly _connection: Connection;

  private readonly _sendConnection: Connection;

  private readonly _endpoint: string;

  private readonly _env: ENV;

  constructor(env: string) {
    const endpoint = ENDPOINTS.find((value) => value.name === env);
    if (endpoint === undefined) {
      throw Error(`Invalid environment - ${env}`);
    }

    this._endpoint = endpoint.endpoint;
    this._env = endpoint.name;
    this._connection = new Connection(this._endpoint, 'confirmed');
    this._sendConnection = new Connection(this._endpoint, 'confirmed');
  }

  get endpoint(): string {
    return this._endpoint;
  }

  get env(): ENV {
    return this._env;
  }

  get connection(): Connection {
    return this._connection;
  }

  get sendConnection(): Connection {
    return this._sendConnection;
  }
}
