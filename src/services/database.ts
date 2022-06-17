import KnexInit from 'knex';
import logger from './logger';
import {
  API_SCHEMA,
  CLUSTER_TABLE,
  COLLATERAL_TABLE,
  LOAN_TABLE,
  METRICS_TABLE,
  MetricsEntity,
  OWNER_TABLE,
  TOKEN_TABLE,
} from '@hubbleprotocol/hubble-db';
import { PublicKey } from '@solana/web3.js';
import { LoanHistoryResponse } from '../models/api/LoanHistoryResponse';
import Decimal from 'decimal.js';
import { ENV } from './web3/client';
import { getEnvOrDefault, getEnvOrThrowInProduction } from '../utils/envUtils';
import { groupBy } from '../utils/arrayUtils';
import { MetricsResponse } from '../models/api/MetricsResponse';
import { MetricsSnapshot } from '../models/api/MetricsSnapshot';
import { getCollateralToken } from '../constants/tokens';
import TokenCollateral from '../models/api/TokenCollateral';

export const connectionString = getEnvOrThrowInProduction(
  'POSTGRES_CONNECTION_STRING',
  'postgres://hubbleUser:hubblePass@localhost:5432/hubble-public-api-local'
);
export const poolMin = Number(getEnvOrDefault('POSTGRES_POOL_MIN', '0'));
export const poolMax = Number(getEnvOrDefault('POSTGRES_POOL_MAX', '10'));

const getPostgresProvider = () => {
  const knex = KnexInit({
    client: 'pg',
    connection: connectionString,
    pool: {
      min: poolMin,
      max: poolMax,
    },
    acquireConnectionTimeout: 2000,
    searchPath: API_SCHEMA,
  });
  knex.on('error', (err) => logger.error(err));
  return knex;
};

let postgres = getPostgresProvider();

export const testDbConnection = async (): Promise<any> => {
  try {
    return await new Promise((resolve) => resolve(postgres.raw('SELECT 1')));
  } catch (err) {
    logger.warn('could not connect to postgres', err);
    throw err;
  }
};

type JoinedLoanRow = {
  usdh_debt: string;
  total_collateral_value: string;
  collateral_ratio: string;
  loan_to_value: string;
  owner_pubkey: string;
  version: string;
  status: string;
  user_id: string;
  user_metadata_pubkey: string;
  borrowing_market_state_pubkey: string;
  deposited_quantity: string;
  inactive_quantity: string;
  price: string;
  token_name: string;
  created_on: Date;
};

export const getLoanHistory = async (loan: PublicKey, cluster: ENV) => {
  const history: LoanHistoryResponse[] = [];

  const rows = await postgres(`${LOAN_TABLE} as l`)
    .select<JoinedLoanRow[]>(
      'l.usdh_debt',
      'l.total_collateral_value',
      'l.collateral_ratio',
      'l.loan_to_value',
      'o.pubkey as owner_pubkey',
      'l.version',
      'l.status',
      'l.user_id',
      'l.user_metadata_pubkey',
      'l.borrowing_market_state_pubkey',
      'c.deposited_quantity',
      'c.inactive_quantity',
      'c.price',
      't.name as token_name',
      'l.created_on'
    )
    .join(`${COLLATERAL_TABLE} as c`, `l.id`, '=', `c.loan_id`)
    .join(`${OWNER_TABLE} as o`, `o.id`, '=', `l.owner_id`)
    .join(`${TOKEN_TABLE} as t`, `c.token_id`, '=', `t.id`)
    .join(`${CLUSTER_TABLE} as cl`, `cl.id`, '=', `o.cluster_id`)
    .where({ 'l.user_metadata_pubkey': loan.toString(), 'cl.name': cluster });
  for (const [timestamp, loans] of groupBy(rows, (x) => x.created_on.valueOf())) {
    const totals: TokenCollateral[] = [];
    for (const row of loans) {
      totals.push({
        token: getCollateralToken(row.token_name)!.name,
        inactive: new Decimal(row.inactive_quantity),
        price: new Decimal(row.price),
        deposited: new Decimal(row.deposited_quantity),
      });
    }
    const loan = loans[0];
    history.push({
      epoch: timestamp,
      loan: {
        loanToValue: new Decimal(loan.loan_to_value),
        collateral: totals.map((x) => ({
          token: x.token,
          price: x.price,
          inactive: x.inactive,
          deposited: x.deposited,
        })),
        totalCollateralValue: new Decimal(loan.total_collateral_value),
        userId: new Decimal(loan.user_id),
        version: parseInt(loan.version),
        status: parseInt(loan.status),
        usdhDebt: new Decimal(loan.usdh_debt),
        collateralRatio: new Decimal(loan.collateral_ratio),
        borrowingMarketState: new PublicKey(loan.borrowing_market_state_pubkey),
        owner: new PublicKey(loan.owner_pubkey),
        metadataPk: new PublicKey(loan.user_metadata_pubkey),
      },
    });
  }
  return history;
};

export const getMetricsHistory = async (cluster: ENV, year: number) => {
  const rows = await postgres(`${METRICS_TABLE} as m`)
    .select<MetricsEntity[]>('m.*')
    .join(`${CLUSTER_TABLE} as cl`, `cl.id`, '=', `m.cluster_id`)
    .whereRaw(`date_part('year', m.created_on) = ?`, year)
    .where('cl.name', '=', cluster)
    .orderBy('m.created_on');
  const snapshots: MetricsSnapshot[] = [];
  for (const row of rows) {
    snapshots.push({
      metrics: row.raw_json as unknown as MetricsResponse,
      createdOn: row.created_on.valueOf(),
      environment: cluster,
    });
  }
  return snapshots;
};

export const getMetricsBetween = async (cluster: ENV, from: Date, to: Date) => {
  const rows = await postgres(`${METRICS_TABLE} as m`)
    .select<MetricsEntity[]>('m.*')
    .join(`${CLUSTER_TABLE} as cl`, `cl.id`, '=', `m.cluster_id`)
    .where(`m.created_on`, '>=', from)
    .where(`m.created_on`, '<', to)
    .where('cl.name', '=', cluster)
    .orderBy('m.created_on');
  const snapshots: MetricsSnapshot[] = [];
  for (const row of rows) {
    snapshots.push({
      metrics: row.raw_json as unknown as MetricsResponse,
      createdOn: row.created_on.valueOf(),
      environment: cluster,
    });
  }
  return snapshots;
};

export const getLidoTotalInvestment = () => {
  // 1. get total investment
  // SQL query: get hubble loans that have existed for the past 14 days, -14days from the latest snapshots
  // filter these loans on sql side:
  // - during these 14 days loans need to have had >= 40% LTV, otherwise they aren't eligible
  // - they also need to hold 40% of total collateral value in stSOL or wstETH
  // return sum of all USDH debt -> this is total investment value
};
