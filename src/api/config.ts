import { ENV } from '../services/web3/client';
import { getConfigByCluster, getAllConfigs, HubbleConfig } from '@hubbleprotocol/hubble-config';
import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { middleware } from './middleware/middleware';

/**
 * Get Hubble config
 */
const configRoute = Router();
configRoute.get(
  '/',
  middleware.validateSolanaCluster,
  (request: Request<never, HubbleConfig | HubbleConfig[], never, EnvironmentQueryParams>, response) => {
    let env: ENV | undefined;
    if (request.query.env) {
      env = request.query.env;
    }
    if (env) {
      response.json(getConfigByCluster(env));
    } else {
      response.json(getAllConfigs());
    }
  }
);

export default configRoute;
