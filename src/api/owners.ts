import { Request } from 'express';
import { LoanResponse } from '../models/api/LoanResponse';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { ENV, Web3Client } from '../services/web3/client';
import { tryGetPublicKeyFromString } from '../utils/tokenUtils';
import { badRequest } from '../utils/apiUtils';
import { Hubble, UserMetadata } from '@hubbleprotocol/hubble-sdk';
import { createSerumMarketService } from '../services/serum/SerumMarketService';
import { MINT_ADDRESSES } from '../constants/tokens';
import { SerumMarket } from '../models/SerumMarket';
import Router from 'express-promise-router';
import { getLoansFromUserVaults, LoansParameters } from './loans';

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
    const serumService = createSerumMarketService();

    const responses = await Promise.all([
      serumService.getMarkets(MINT_ADDRESSES, 'confirmed'),
      hubbleSdk.getUserMetadatas(user),
    ]);

    const serumMarkets: Record<string, SerumMarket> = responses[0];
    const userVaults: UserMetadata[] = responses[1];
    const loans = getLoansFromUserVaults(userVaults, serumMarkets);

    response.send(loans);
  }
);

export default ownersRoute;
