import KnexInit from 'knex';
import { API_SCHEMA } from '@hubbleprotocol/hubble-db';

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

let postgres = getPostgresProvider();
