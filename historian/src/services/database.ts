import KnexInit from 'knex';
import {
  API_SCHEMA,
  CLUSTER_TABLE,
  ClusterEntity,
  COLLATERAL_TABLE,
  CollateralEntity,
  LOAN_TABLE,
  LoanEntity,
  OWNER_TABLE,
  OwnerEntity,
  TOKEN_TABLE,
  TokenEntity,
} from '@hubbleprotocol/hubble-db';
import { LoanResponseWithJson } from '../models/LoanResponse';

export const connectionString =
  process.env.POSTGRES_CONNECTION_STRING || 'postgres://hubbleUser:hubblePass@localhost:5432/hubble-public-api-local';
export const poolMin = Number(process.env.POSTGRES_POOL_MIN || '0');
export const poolMax = Number(process.env.POSTGRES_POOL_MAX || '10');

const getPostgresProvider = () => {
  return KnexInit({
    client: 'pg',
    connection: connectionString,
    pool: {
      min: poolMin,
      max: poolMax,
    },
    acquireConnectionTimeout: 2000,
    searchPath: API_SCHEMA,
  });
};

export const postgres = getPostgresProvider();

export const testConnection = () => {
  return postgres.raw('SELECT now()');
};

type RowId = {
  id: number;
};

/**
 * Get existing cluster if it exists, otherwise insert it and return that
 * @param name
 */
export const getOrInsertCluster = async (name: string) => {
  let cluster = await postgres<ClusterEntity>(CLUSTER_TABLE).where('name', name).first();
  if (!cluster) {
    const id = await postgres(CLUSTER_TABLE)
      .insert<ClusterEntity>({ name: name })
      .returning<RowId[]>('id')
      .then((ids) => ids[0].id);
    cluster = { name, id };
  }
  return cluster;
};

/**
 * Get existing loan owner or create a new one
 * @param ownerPubKey owner public key in base58 encoded string
 * @param clusterId solana cluster ID
 */
export const getOrInsertOwner = async (ownerPubKey: string, clusterId: number) => {
  const query = { pubkey: ownerPubKey, cluster_id: clusterId };
  let owner = await postgres<OwnerEntity>(OWNER_TABLE).where(query).first();
  if (!owner) {
    const id = await postgres(OWNER_TABLE)
      .insert<OwnerEntity>(query)
      .returning<RowId[]>('id')
      .then((ids) => ids[0].id);
    owner = { id, cluster_id: clusterId, pubkey: ownerPubKey };
  }
  return owner;
};

/**
 * Insert loans and their collateral
 * @param owner Owner database object
 * @param loans Loan data of the owner
 * @param timestamp Timestamp of snapshot capture
 */
export const insertLoans = async (owner: OwnerEntity, loans: LoanResponseWithJson[], timestamp: Date) => {
  return postgres.transaction(async (tx) => {
    const tokens: TokenEntity[] = [];
    for (const token of [...new Set(loans.flatMap((x) => x.collateral).map((x) => x.token))]) {
      let tokenDto = await postgres<TokenEntity>(TOKEN_TABLE).where('name', token).first();
      if (!tokenDto) {
        const id = await postgres(TOKEN_TABLE)
          .insert<TokenEntity>({ name: token })
          .returning<RowId[]>('id')
          .transacting(tx)
          .then((ids) => ids[0].id);
        tokenDto = { id, name: token };
      }
      tokens.push(tokenDto);
    }
    for (const loan of loans) {
      // loan JSON response has escaped characters since its a raw json inside a json
      // this means we first parse it and get rid of escaped characters
      // then we stringify it again and insert it into database
      const rawJson = JSON.stringify(JSON.parse(loan.jsonResponse));
      await postgres(LOAN_TABLE)
        .insert<LoanEntity>({
          loan_to_value: loan.loanToValue,
          user_metadata_pubkey: loan.metadataPk,
          status: loan.status.toString(),
          version: loan.version.toString(),
          borrowing_market_state_pubkey: loan.borrowingMarketState,
          collateral_ratio: loan.collateralRatio,
          created_on: timestamp,
          owner_id: owner.id,
          total_collateral_value: loan.totalCollateralValue,
          usdh_debt: loan.usdhDebt,
          user_id: loan.userId,
          raw_json: rawJson,
        })
        .returning<RowId[]>('id')
        .transacting(tx)
        .then(async (loanIds) => {
          const insertData = loan.collateral.map((x) => ({
            deposited_quantity: x.deposited.toString(),
            loan_id: loanIds[0].id,
            price: x.price.toString(),
            inactive_quantity: x.inactive.toString(),
            token_id: tokens.find((tok) => tok.name === x.token)!.id,
          }));
          await postgres<CollateralEntity>(COLLATERAL_TABLE).insert<CollateralEntity[]>(insertData).transacting(tx);
        });
    }
  });
};
