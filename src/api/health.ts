import Router from 'express-promise-router';
import { Request } from 'express';
import { getEnvOrThrow } from '../utils/envUtils';
import { getRedisEnvironmentVariables } from '../services/environmentService';
import RedisService from '../services/RedisService';
import { badGateway } from '../utils/apiUtils';
import logger from '../services/logger';

const version = getEnvOrThrow('API_VERSION');
const redisEnv = getRedisEnvironmentVariables();
const redisUrl = `http://${redisEnv.REDIS_HOST}:${redisEnv.REDIS_PORT}`;
const redis = new RedisService(redisEnv.REDIS_HOST, redisEnv.REDIS_PORT);
redis
  .connect()
  .then(() => logger.info(`✅ [redis] Connected at ${redisUrl}`))
  .catch((e) => {
    logger.error(`❌ [redis] could not connect at ${redisUrl}`, e);
  });

/**
 * API Health check and check connection to Redis
 */
const healthRoute = Router();
healthRoute.get('/', (request: Request<never, string, never, never>, response) => {
  redis
    .ping()
    .then(() => response.send(version))
    .catch(async (e) => {
      const err = `could not ping redis at ${redisUrl}`;
      logger.warn(err, e);
      logger.info('retrying connection to redis', redisUrl);
      await redis
        .connect()
        .then(() => logger.info(`✅ [redis] Connected at ${redisUrl}`))
        .catch(() => {
          response.status(badGateway).send(err);
        });
    });
});

export default healthRoute;
