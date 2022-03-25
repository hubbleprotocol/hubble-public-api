import Router from 'express-promise-router';
import { Request } from 'express';
import { getEnvOrThrow } from '../utils/envUtils';
import { getRedisEnvironmentVariables } from '../services/environmentService';
import { badGateway } from '../utils/apiUtils';
import logger from '../services/logger';
import RedisProvider from '../services/redis';
import { testDbConnection } from '../services/database';

const version = getEnvOrThrow('API_VERSION');
const redisEnv = getRedisEnvironmentVariables();
const redisUrl = `http://${redisEnv.REDIS_HOST}:${redisEnv.REDIS_PORT}`;

/**
 * API Health check (check db and redis connection)
 */
const healthRoute = Router();
healthRoute.get('/', async (request: Request<never, string, never, never>, response) => {
  const redis = RedisProvider.getInstance();
  try {
    await redis.client.ping();
  } catch (e) {
    const err = `could not ping redis ${redisUrl}`;
    logger.warn(err, e);
    response.status(badGateway).send(err);
    return;
  }
  try {
    await testDbConnection();
  } catch (e) {
    const err = `could not connect to postgres database`;
    logger.warn(err, e);
    response.status(badGateway).send(err);
    return;
  }
  response.send(version);
});

export default healthRoute;
