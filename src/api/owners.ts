import { Request } from 'express';
import { LoanResponse } from '../models/api/LoanResponse';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { ENV, Web3Client } from '../services/web3/client';
import { getPythTokens, tryGetPublicKeyFromString } from '../utils/tokenUtils';
import { badRequest } from '../utils/apiUtils';
import { Hubble, UserMetadata } from '@hubbleprotocol/hubble-sdk';
import Router from 'express-promise-router';
import { getLoansFromUserVaults, LoansParameters } from './loans';
import { getConfigByCluster } from '@hubbleprotocol/hubble-config';
import { PythPrice, PythPriceService } from '../services/price/PythPriceService';

const ownersRoute = Router();

/**
 * Get a list of loans for specific owner's public key (base58 encoded string)
 */
ownersRoute.get(
  '/:pubkey/loans',
  async (request: Request<LoansParameters, LoanResponse[] | string, never, EnvironmentQueryParams>, response) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';

    let user = tryGetPublicKeyFromString(request.params.pubkey);
    if (!user) {
      response.status(badRequest).send(`could not parse public key from: ${request.params.pubkey}`);
      return;
    }

    let web3Client: Web3Client = new Web3Client(env);
    const hubbleSdk = new Hubble(env, web3Client.connection);

    const config = getConfigByCluster(env);
    const pythService = new PythPriceService(web3Client);

    const responses = await Promise.all([
      pythService.getTokenPrices(getPythTokens(config)),
      hubbleSdk.getUserMetadatas(user),
    ]);

    const pythPrices: PythPrice[] = responses[0];
    const userVaults: UserMetadata[] = responses[1];
    const loans = getLoansFromUserVaults(userVaults, pythPrices);

    response.send(loans);
  }
);

export default ownersRoute;
