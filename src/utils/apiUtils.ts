import { ENV, Web3Client } from '../services/web3/client';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import logger from '../services/logger';

export const ok = 200;
export const badRequest = 400;
export const unprocessable = 422;
export const internalError = 500;
export const badGateway = 502;

export const parseFromQueryParams = (
  queryParams: EnvironmentQueryParams
): [web3Client: Web3Client | undefined, env: ENV | undefined, error: string | undefined] => {
  // use mainnet-beta as a default value
  let env: ENV = 'mainnet-beta';
  if (queryParams.env) {
    env = queryParams.env;
  }

  let web3Client: Web3Client;
  try {
    web3Client = new Web3Client(env);
  } catch (e) {
    const error = e as Error;
    logger.error(error);
    return [undefined, undefined, error.message];
  }

  return [web3Client, env, undefined];
};
