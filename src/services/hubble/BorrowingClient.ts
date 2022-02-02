import { Idl, Program, Provider } from '@project-serum/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import BorrowingIdl from './borrowing.json';
import { getConfigByEnv } from './hubbleConfig';
import StakingPoolState from '../../models/hubble/StakingPoolState';
import StabilityPoolState from '../../models/hubble/StabilityPoolState';
import { BorrowingMarketState } from '../../models/hubble/BorrowingMarketState';
import { ENV } from '../web3/client';
import { HubbleConfig } from '../../models/hubble/HubbleConfig';
import { UserMetadata } from '../../models/hubble/UserMetadata';
import { StabilityProviderState } from '../../models/hubble/StabilityProviderState';

export class BorrowingClient {
  private readonly _client: Program;
  private readonly _provider: Provider;
  private readonly _config: HubbleConfig;

  constructor(connection: Connection, env: ENV) {
    this._config = getConfigByEnv(env);
    // create a provider with a read only wallet
    this._provider = new Provider(
      connection,
      {
        publicKey: Keypair.generate().publicKey,
        signAllTransactions: async (txs) => txs,
        signTransaction: async (txs) => txs,
      },
      { commitment: 'confirmed' }
    );
    this._client = new Program(BorrowingIdl as Idl, this._config.borrowing.programId, this._provider);
  }

  getStakingPoolState(): Promise<StakingPoolState> {
    return this._client.account.stakingPoolState.fetch(
      this._config.borrowing.accounts.stakingPoolState
    ) as Promise<StakingPoolState>;
  }

  getStabilityPoolState(): Promise<StabilityPoolState> {
    return this._client.account.stabilityPoolState.fetch(
      this._config.borrowing.accounts.stabilityPoolState
    ) as Promise<StabilityPoolState>;
  }

  async getStabilityProviders(): Promise<StabilityProviderState[]> {
    const stabilityProviders = await this._client.account.stabilityProviderState.all();
    return stabilityProviders
      .map((x) => x.account as StabilityProviderState)
      .filter((x) => {
        return x.stabilityPoolState.toString() === this._config.borrowing.accounts.stabilityPoolState.toString();
      });
  }

  getBorrowingMarketState(): Promise<BorrowingMarketState> {
    return this._client.account.borrowingMarketState.fetch(
      this._config.borrowing.accounts.borrowingMarketState
    ) as Promise<BorrowingMarketState>;
  }

  async getTreasuryVault() {
    const acccountBalance = await this._provider.connection.getTokenAccountBalance(
      this._config.borrowing.accounts.treasuryVault!
    );
    return acccountBalance.value;
  }

  async getHbbMintAccount() {
    const tokenSupply = await this._provider.connection.getTokenSupply(this._config.borrowing.accounts.mint.HBB);
    return tokenSupply.value;
  }

  async getUserVaults() {
    //TODO: use memcmp filter and return the userdata we need, not everything like right now
    return (await this._client.account.userMetadata.all())
      .map((x) => x.account as UserMetadata)
      .filter((x) => {
        return x.borrowingMarketState.toString() === this._config.borrowing.accounts.borrowingMarketState.toString();
      });
  }

  getHbbProgramAccounts() {
    //how to get all token accounts for specific mint: https://spl.solana.com/token#finding-all-token-accounts-for-a-specific-mint
    //get it from the hardcoded token program and create a filter with the actual mint address
    //datasize:165 filter selects all token accounts, memcmp filter selects based on the mint address withing each token account
    const tokenProgram = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    return this._provider.connection.getParsedProgramAccounts(tokenProgram, {
      filters: [
        { dataSize: 165 },
        { memcmp: { offset: 0, bytes: this._config.borrowing.accounts.mint.HBB.toBase58() } },
      ],
    });
  }
}
