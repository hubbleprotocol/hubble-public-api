import { parseFromQueryParams, unprocessable } from '../utils/apiUtils';
import { BorrowingClient } from '../services/hubble/BorrowingClient';
import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';

/**
 * Get circulating supply of HBB (amount of HBB issued). This endpoint is required for external services like CoinGecko.
 */
const circulatingSupplyRoute = Router();
circulatingSupplyRoute.get('/', async (request: Request<never, string, never, EnvironmentQueryParams>, response) => {
  const [web3Client, env, error] = parseFromQueryParams(request.query);
  if (web3Client && env) {
    const client = new BorrowingClient(web3Client.connection, env);
    const hbbMint = await client.getHbbMintAccount();
    const circulatingSupply = hbbMint.uiAmount as number;
    response.send(circulatingSupply.toString());
  } else {
    response.status(unprocessable).send(error);
  }
});

export default circulatingSupplyRoute;
