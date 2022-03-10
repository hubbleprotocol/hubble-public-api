import { parseFromQueryParams, unprocessable } from '../utils/apiUtils';
import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { Hubble } from '@hubbleprotocol/hubble-sdk';
import { BorrowingVersionResponse } from '../models/api/BorrowingVersionResponse';

/**
 * Get current borrowing market state version
 */
const borrowingVersionRoute = Router();
borrowingVersionRoute.get(
  '/',
  async (request: Request<never, string | BorrowingVersionResponse, never, EnvironmentQueryParams>, response) => {
    const [web3Client, env, error] = parseFromQueryParams(request.query);
    if (web3Client && env) {
      const hubbleSdk = new Hubble(env, web3Client.connection);
      const market = await hubbleSdk.getBorrowingMarketState();
      response.send({ version: market.version });
    } else {
      response.status(unprocessable).send(error);
    }
  }
);

export default borrowingVersionRoute;
