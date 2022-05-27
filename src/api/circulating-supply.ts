import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { Hubble } from '@hubbleprotocol/hubble-sdk';
import redis, { CacheExpiryType } from '../services/redis/redis';
import { getCirculatingSupplyRedisKey } from '../services/redis/keyProvider';
import { CIRCULATING_SUPPLY_EXPIRY_IN_SECONDS } from '../constants/redis';
import { ENV, Web3Client } from '../services/web3/client';
import logger from '../services/logger';
import { internalError } from '../utils/apiUtils';

/**
 * Get circulating supply of HBB (amount of HBB issued). This endpoint is required for external services like CoinGecko.
 */
const circulatingSupplyRoute = Router();
circulatingSupplyRoute.get('/', async (request: Request<never, string, never, EnvironmentQueryParams>, response) => {
  const env: ENV = request.query.env ?? 'mainnet-beta';
  try {
    const circulatingSupply = await getCirculatingSupply(env);
    response.send(circulatingSupply);
  } catch (e) {
    logger.error(e);
    response.status(internalError).send('Could not get circulating supply');
  }
});

export default circulatingSupplyRoute;

export async function getCirculatingSupply(env: ENV): Promise<string> {
  const key = getCirculatingSupplyRedisKey(env);
  return redis.cacheFetch(key, () => fetchCirculatingSupply(env), {
    cacheExpirySeconds: CIRCULATING_SUPPLY_EXPIRY_IN_SECONDS,
    cacheExpiryType: CacheExpiryType.ExpireInSeconds,
  });
}

export async function fetchCirculatingSupply(env: ENV): Promise<string> {
  const web3Client = new Web3Client(env);
  const hubbleSdk = new Hubble(env, web3Client.connection);
  return (await hubbleSdk.getHbbCirculatingSupply()).toString();
}
