import { parseFromQueryParams, unprocessable } from '../utils/apiUtils';
import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { OrcaPriceService } from '../services/price/OrcaPriceService';
import { Hubble } from '@hubbleprotocol/hubble-sdk';
import redis from '../services/redis/redis';
import { getCirculatingSupplyValueRedisKey } from '../services/redis/keyProvider';
import { CIRCULATING_SUPPLY_EXPIRY_IN_SECONDS } from '../constants/redis';

/**
 * Get circulating supply value of HBB (HBB issued * HBB price). This endpoint is required for external services like CoinMarketCap.
 */
const circulatingSupplyValueRoute = Router();
circulatingSupplyValueRoute.get(
  '/',
  async (request: Request<never, string, never, EnvironmentQueryParams>, response) => {
    const [web3Client, env, error] = parseFromQueryParams(request.query);
    if (web3Client && env) {
      const redisKey = getCirculatingSupplyValueRedisKey(env);
      const cached = await redis.getKey(redisKey);
      if (cached) {
        response.send(cached);
      } else {
        const client = new Hubble(env, web3Client.connection);
        const orcaService = new OrcaPriceService();
        const circulatingSupply = await client.getHbbCirculatingSupply();
        const hbbPrice = (await orcaService.getHbbPrice()).getRate();
        const circulatingSupplyValue = circulatingSupply.mul(hbbPrice);
        response.send(circulatingSupplyValue.toString());
        await redis.saveWithExpiry(redisKey, circulatingSupplyValue.toString(), CIRCULATING_SUPPLY_EXPIRY_IN_SECONDS);
      }
    } else {
      response.status(unprocessable).send(error);
    }
  }
);

export default circulatingSupplyValueRoute;
