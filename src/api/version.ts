import Router from 'express-promise-router';
import { Request } from 'express';
import { getEnvOrThrow } from '../utils/envUtils';

const version = getEnvOrThrow('API_VERSION');

/**
 * Get current API version
 */
const versionRoute = Router();
versionRoute.get('/', (request: Request<never, string, never, never>, response) => {
  response.send(version);
});

export default versionRoute;
