import { ENV, Web3Client } from '../services/web3/client';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import logger from '../services/logger';
import { Response } from 'express';
import redis from '../services/redis/redis';

export const ok = 200;
export const badRequest = 400;
export const notFound = 404;
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

/**
 * Send a response to the client with the cache-control header setup.
 * With this configuration, Cloudflare attempts to revalidate the content with the origin server after it has been in cache for redis key TTL.
 * If the server returns an error instead of proper revalidation responses,
 * Cloudflare continues serving the stale resource for a total of one minute beyond the expiration of the resource.
 * @param key - redis key
 * @param res - express handler response object
 * @param body - body of the response
 */
export const sendWithCacheControl = async (key: string, res: Response, body: any) => {
  const ttl = await redis.client.ttl(key);
  res.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}, stale-if-error=60`);
  res.send(body);
};
