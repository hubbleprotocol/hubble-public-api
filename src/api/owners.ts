import { Request } from 'express';
import { LoanResponse } from '../models/api/LoanResponse';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { ENV, Web3Client } from '../services/web3/client';
import { tryGetPublicKeyFromString } from '../utils/tokenUtils';
import { badRequest, internalError, sendWithCacheControl } from '../utils/apiUtils';
import { Hubble, UserMetadata } from '@hubbleprotocol/hubble-sdk';
import Router from 'express-promise-router';
import { getLoansFromUserVaults, PubkeyParameter } from './loans';
import { getConfigByCluster } from '@hubbleprotocol/hubble-config';
import { PythPrice, PythPriceService } from '../services/price/PythPriceService';
import redis, { CacheExpiryType } from '../services/redis/redis';
import { getOwnerRedisKey } from '../services/redis/keyProvider';
import { PublicKey } from '@solana/web3.js';
import { LOANS_EXPIRY_IN_SECONDS } from '../constants/redis';
import logger from '../services/logger';
import { middleware } from './middleware/middleware';

const ownersRoute = Router();

/**
 * Get a list of loans for specific owner's public key (base58 encoded string)
 */
ownersRoute.get(
  '/:pubkey/loans',
  middleware.validateSolanaCluster,
  async (request: Request<PubkeyParameter, LoanResponse[] | string, never, EnvironmentQueryParams>, response) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';
    const user = tryGetPublicKeyFromString(request.params.pubkey);
    if (!user) {
      response.status(badRequest).send(`could not parse public key from: ${request.params.pubkey}`);
      return;
    }
    const key = getOwnerRedisKey(user, env);
    try {
      const loans = await redis.cacheFetchJson(key, () => getOwnerLoans(env, user), {
        cacheExpiryType: CacheExpiryType.ExpireInSeconds,
        cacheExpirySeconds: LOANS_EXPIRY_IN_SECONDS,
      });
      await sendWithCacheControl(key, response, loans);
    } catch (e) {
      logger.error(e);
      response.status(internalError).send('Could not get owner loans');
    }
  }
);

async function getOwnerLoans(env: ENV, user: PublicKey) {
  let web3Client: Web3Client = new Web3Client(env);
  const hubbleSdk = new Hubble(env, web3Client.connection);
  const config = getConfigByCluster(env);
  const pythService = new PythPriceService(web3Client, config);
  const responses = await Promise.all([pythService.getTokenPrices(), hubbleSdk.getUserMetadatas(user)]);
  const pythPrices: PythPrice[] = responses[0];
  const userVaults: UserMetadata[] = responses[1];
  return getLoansFromUserVaults(userVaults, pythPrices);
}

export default ownersRoute;
