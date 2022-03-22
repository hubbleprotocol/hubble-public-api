import KnexInit from 'knex';
import logger from './logger';
import {
  API_SCHEMA,
  CLUSTER_TABLE,
  COLLATERAL_TABLE,
  LOAN_TABLE,
  OWNER_TABLE,
  TOKEN_TABLE,
} from '@hubbleprotocol/hubble-db';
import { PublicKey } from '@solana/web3.js';
import { LoanHistoryResponse } from '../models/api/LoanHistoryResponse';
import Decimal from 'decimal.js';
import { groupBy } from '../../historian/src/utils/arrayUtils';
import { CollateralTotals, SupportedToken } from '@hubbleprotocol/hubble-sdk';
import { ENV } from './web3/client';
import { getEnvOrDefault, getEnvOrThrowInProduction } from '../utils/envUtils';

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
    const totals: CollateralTotals[] = [];
    for (const row of loans) {
      totals.push({
        token: row.token_name as SupportedToken,
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
        collateral: totals,
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
