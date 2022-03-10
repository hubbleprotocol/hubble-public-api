import Router from 'express-promise-router';
import { Request } from 'express';
import { getEnvOrThrow } from '../utils/envUtils';
import { getRedisEnvironmentVariables } from '../services/environmentService';
import RedisService from '../services/RedisService';
import { badGateway } from '../utils/apiUtils';

const version = getEnvOrThrow('API_VERSION');
const redisEnv = getRedisEnvironmentVariables();
const redis = new RedisService(redisEnv.REDIS_HOST, redisEnv.REDIS_PORT);

/**
 * API Health check and check connection to Redis
 */
const healthRoute = Router();
healthRoute.get('/', (request: Request<never, string, never, never>, response) => {
  redis
    .connect()
    .then(() => response.send(version))
    .catch((e) => {
      const err = `could not connect to redis at http://${redisEnv.REDIS_HOST}:${redisEnv.REDIS_PORT}`;
      console.error(err, e);
      response.status(badGateway).send(err);
    });
});

export default healthRoute;
