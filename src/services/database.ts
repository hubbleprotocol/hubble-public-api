import KnexInit from 'knex';
import { API_SCHEMA, CLUSTER_TABLE, ClusterEntity } from '../models/database';
import logger from './logger';

export const connectionString =
  process.env.POSTGRES_CONNECTION_STRING || 'postgres://hubbleUser:hubblePass@localhost:5432/hubble-public-api-local';
export const poolMin = Number(process.env.POSTGRES_POOL_MIN || '0');
export const poolMax = Number(process.env.POSTGRES_POOL_MAX || '10');

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

export const getClusterByName = (name: string) => {
  return postgres<ClusterEntity>(CLUSTER_TABLE).where('name', name).first();
};
