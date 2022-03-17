import Router from 'express-promise-router';
import { Request } from 'express';
import { getEnvOrThrow } from '../utils/envUtils';
import { getRedisEnvironmentVariables } from '../services/environmentService';
import RedisService from '../services/RedisService';
import { badGateway } from '../utils/apiUtils';

const version = getEnvOrThrow('API_VERSION');
const redisEnv = getRedisEnvironmentVariables();
const redis = new RedisService(redisEnv.REDIS_HOST, redisEnv.REDIS_PORT);
redis
  .connect()
  .then(() => console.log(`✅ [redis] Connected at http://${redisEnv.REDIS_HOST}:${redisEnv.REDIS_PORT}`))
  .catch((e) => {
    console.error(`❌ [redis] could not connect at http://${redisEnv.REDIS_HOST}:${redisEnv.REDIS_PORT}`, e);
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
      const err = `could not ping redis at http://${redisEnv.REDIS_HOST}:${redisEnv.REDIS_PORT}`;
      console.error(err, e);
      console.log('retrying connection to redis');
      await redis
        .connect()
        .then(() => console.log(`✅ [redis] Connected at http://${redisEnv.REDIS_HOST}:${redisEnv.REDIS_PORT}`))
        .catch(() => {
          response.status(badGateway).send(err);
        });
    });
});

export default healthRoute;
