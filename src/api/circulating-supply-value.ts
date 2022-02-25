import { parseFromQueryParams, unprocessable } from '../utils/apiUtils';
import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { BorrowingClient } from '../services/hubble/BorrowingClient';
import { OrcaPriceService } from '../services/price/OrcaPriceService';

/**
 * Get circulating supply value of HBB (HBB issued * HBB price). This endpoint is required for external services like CoinMarketCap.
 */
const circulatingSupplyValueRoute = Router();
circulatingSupplyValueRoute.get(
  '/',
  async (request: Request<never, string, never, EnvironmentQueryParams>, response) => {
    const [web3Client, env, error] = parseFromQueryParams(request.query);
    if (web3Client && env) {
      const client = new BorrowingClient(web3Client.connection, env);
      const orcaService = new OrcaPriceService();
      const hbbMint = await client.getHbbMintAccount();
      const hbbPrice = (await orcaService.getHbbPrice()).getRate().toNumber();
      const circulatingSupplyValue = (hbbMint.uiAmount as number) * hbbPrice;
      response.send(circulatingSupplyValue.toString());
    } else {
      response.status(unprocessable).send(error);
    }
  }
);

export default circulatingSupplyValueRoute;
