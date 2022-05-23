import Router from 'express-promise-router';
import { Request } from 'express';
import { getEnvOrThrow } from '../utils/envUtils';
import { badGateway } from '../utils/apiUtils';
import logger from '../services/logger';
import RedisProvider from '../services/redis/redis';
import { testDbConnection } from '../services/database';

const version = getEnvOrThrow('API_VERSION');

/**
 * API Health check (check db and redis connection)
 */
const healthRoute = Router();
healthRoute.get('/', async (request: Request<never, string, never, never>, response) => {
  const redis = RedisProvider.getInstance();
  try {
    await Promise.all([redis.ping(), testDbConnection()]);
  } catch (err) {
    logger.error('healthcheck failed', err);
    response.status(badGateway).send('Healthcheck failed');
    return;
  }
  response.send(version);
});

export default healthRoute;
