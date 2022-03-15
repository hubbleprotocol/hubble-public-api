import Router from 'express-promise-router';
import { Request } from 'express';
import { ENV, Web3Client } from '../services/web3/client';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { badRequest } from '../utils/apiUtils';
import { tryGetPublicKeyFromString } from '../utils/tokenUtils';
import { MINT_ADDRESSES, SUPPORTED_TOKENS } from '../constants/tokens';
import { Hubble, UserMetadata } from '@hubbleprotocol/hubble-sdk';
import Decimal from 'decimal.js';
import { calculateCollateralRatio, getTokenCollateral } from '../utils/calculations';
import { STABLECOIN_DECIMALS } from '../constants/math';
import { createSerumMarketService } from '../services/serum/SerumMarketService';
import { SerumMarket } from '../models/SerumMarket';
import { LoanResponse } from '../models/api/LoanResponse';
import { LoanHistoryResponse } from '../models/api/LoanHistoryResponse';

/**
 * Get live Hubble on-chain loan data
 */
const loansRoute = Router();

/**
 * Get all loans
 */
loansRoute.get('/', async (request: Request<never, LoanResponse[], never, EnvironmentQueryParams>, response) => {
  let env: ENV = request.query.env ?? 'mainnet-beta';

  let web3Client: Web3Client = new Web3Client(env);
  const hubbleSdk = new Hubble(env, web3Client.connection);
  const serumService = createSerumMarketService();

  const responses = await Promise.all([
    serumService.getMarkets(MINT_ADDRESSES, 'confirmed'),
    hubbleSdk.getAllUserMetadatas(),
  ]);

  const serumMarkets: Record<string, SerumMarket> = responses[0];
  const userVaults: UserMetadata[] = responses[1];
  const loans = getLoansFromUserVaults(userVaults, serumMarkets);

  response.send(loans);
});

interface LoansParameters {
  pubkey: string;
}
/**
 * Get a list of loans for specific public key (base58 encoded string)
 */
loansRoute.get(
  '/:pubkey',
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

/**
 * Get history of loans for specific public key (base58 encoded string)
 */
loansRoute.get(
  '/:pubkey/history',
  async (
    request: Request<LoansParameters, LoanHistoryResponse[] | string, never, EnvironmentQueryParams>,
    response
  ) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';
    let user = tryGetPublicKeyFromString(request.params.pubkey);
    if (!user) {
      response.status(badRequest).send(`could not parse public key from: ${request.params.pubkey}`);
      return;
    }

    //TODO: READ FROM AWS, this is just mock response with live data and not actual history

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

    const history = [];
    for (let i = 0; i < 3; i++) {
      history.push({ epoch: new Date().valueOf() + i * 5000, loans: loans });
    }

    response.send(history);
  }
);

function getLoansFromUserVaults(userVaults: UserMetadata[], serumMarkets: Record<string, SerumMarket>) {
  const loans: LoanResponse[] = [];
  for (const userVault of userVaults.filter((x) => x.borrowedStablecoin.greaterThan(0))) {
    const borrowedStablecoin = userVault.borrowedStablecoin.dividedBy(STABLECOIN_DECIMALS);
    let collateralTotal = new Decimal(0);
    const collateralTotals = [];
    for (const token of SUPPORTED_TOKENS) {
      const coll = getTokenCollateral(token, userVault.depositedCollateral, userVault.inactiveCollateral, serumMarkets);
      collateralTotals.push(coll);
      collateralTotal = collateralTotal.add(coll.deposited.mul(coll.price));
    }
    const collRatio = calculateCollateralRatio(borrowedStablecoin, collateralTotal);
    const ltv = new Decimal(100).dividedBy(collRatio);

    loans.push({
      loanToValue: ltv,
      totalCollateralValue: collateralTotal,
      collateral: collateralTotals,
      collateralRatio: collRatio,
      usdhDebt: borrowedStablecoin,
      metadataPk: userVault.metadataPk,
      owner: userVault.owner,
      status: userVault.status,
      userId: userVault.userId,
      borrowingMarketState: userVault.borrowingMarketState,
      version: userVault.version,
    });
  }
  return loans;
}

export default loansRoute;
