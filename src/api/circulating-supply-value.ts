import { internalError, parseFromQueryParams, unprocessable } from '../utils/apiUtils';
import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { OrcaPriceService } from '../services/price/OrcaPriceService';
import redis from '../services/redis/redis';
import { getCirculatingSupplyValueRedisKey } from '../services/redis/keyProvider';
import { CIRCULATING_SUPPLY_EXPIRY_IN_SECONDS } from '../constants/redis';
import { ENV } from "../services/web3/client";
import { getCirculatingSupply } from "./circulating-supply";
import Decimal from "decimal.js";
import logger from "../services/logger";

/**
 * Get circulating supply value of HBB (HBB issued * HBB price). This endpoint is required for external services like CoinMarketCap.
 */
const circulatingSupplyValueRoute = Router();
circulatingSupplyValueRoute.get(
  '/',
  async (request: Request<never, string, never, EnvironmentQueryParams>, response) => {
    const env: ENV = request.query.env ?? 'mainnet-beta';
    try {
      const circulatingSupplyValue = await getCirculatingSupplyValue(env);
      response.send(circulatingSupplyValue);
    } catch (e) {
      logger.error(e);
      response.status(internalError).send('Could not get circulating supply value');
    }
  }
);

export default circulatingSupplyValueRoute;

export async function getCirculatingSupplyValue(env: ENV): Promise<string> {
  const key = getCirculatingSupplyValueRedisKey(env);
  return redis.cacheFetch(key, () => fetchCirculatingSupplyValue(env), { cacheExpirySeconds: CIRCULATING_SUPPLY_EXPIRY_IN_SECONDS });
}

export async function fetchCirculatingSupplyValue(env: ENV): Promise<string> {
  const circulatingSupply = new Decimal(await getCirculatingSupply(env));
  const orcaService = new OrcaPriceService();
  const hbbPrice = (await orcaService.getHbbPrice()).getRate();
  const circulatingSupplyValue = circulatingSupply.mul(hbbPrice);
  return circulatingSupplyValue.toString();
}
