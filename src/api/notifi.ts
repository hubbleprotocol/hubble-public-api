import Router from 'express-promise-router';
import { middleware } from './middleware/middleware';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { ENV } from '../services/web3/client';
import { getNotifiRedisKey } from '../services/redis/keyProvider';
import { badRequest, internalError, sendWithCacheControl } from '../utils/apiUtils';
import logger from '../services/logger';
import { tryGetPublicKeyFromString } from '../utils/tokenUtils';
import { PubkeyParameter } from './loans';

const notifiRoute = Router();
notifiRoute.get(
  '/',
  middleware.validateSolanaCluster,
  async (request: Request<PubkeyParameter, string, never, EnvironmentQueryParams>, response) => {
    const env: ENV = request.query.env ?? 'mainnet-beta';
    const wallet = tryGetPublicKeyFromString(request.params.pubkey);
    if (!wallet) {
      response.status(badRequest).send(`could not parse wallet public key from: ${request.params.pubkey}`);
      return;
    }
    const key = getNotifiRedisKey(env, wallet);
    try {
      await sendWithCacheControl(key, response, 'sth');
    } catch (e) {
      logger.error(e);
      response.status(internalError).send('Could not get notifi wallet info');
    }
  }
);

export default notifiRoute;
