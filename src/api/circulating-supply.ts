import { parseFromQueryParams, unprocessable } from '../utils/apiUtils';
import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { Hubble } from '@hubbleprotocol/hubble-sdk';
import RedisProvider from '../services/redis/redis';
import { getCirculatingSupplyRedisKey } from '../services/redis/keyProvider';

/**
 * Get circulating supply of HBB (amount of HBB issued). This endpoint is required for external services like CoinGecko.
 */
const circulatingSupplyRoute = Router();
circulatingSupplyRoute.get('/', async (request: Request<never, string, never, EnvironmentQueryParams>, response) => {
  const [web3Client, env, error] = parseFromQueryParams(request.query);
  if (web3Client && env) {
    const redis = RedisProvider.getInstance();
    const redisKey = getCirculatingSupplyRedisKey(env);
    const cached = await redis.getKey(redisKey);
    if (cached) {
      response.send(cached);
    } else {
      const hubbleSdk = new Hubble(env, web3Client.connection);
      const circulatingSupply = await hubbleSdk.getHbbCirculatingSupply();
      response.send(circulatingSupply.toString());
      await redis.saveWithExpiry(redisKey, circulatingSupply.toString(), 60);
    }
  } else {
    response.status(unprocessable).send(error);
  }
});

export default circulatingSupplyRoute;
