import Router from 'express-promise-router';
import { Request, Response } from 'express';
import { ENV, Web3Client } from '../services/web3/client';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { badRequest, internalError, notFound, sendWithCacheControl } from '../utils/apiUtils';
import { tryGetPublicKeyFromString } from '../utils/tokenUtils';
import { CollateralTokens } from '../constants/tokens';
import { Hubble, UserMetadata, UserMetadataWithJson } from '@hubbleprotocol/hubble-sdk';
import Decimal from 'decimal.js';
import { calculateCollateralRatio, getNextSnapshotDate, getTokenCollateral } from '../utils/calculations';
import { STABLECOIN_DECIMALS } from '../constants/math';
import { LoanResponse, LoanResponseWithJson } from '../models/api/LoanResponse';
import { LoanHistoryResponse } from '../models/api/LoanHistoryResponse';
import { PublicKey } from '@solana/web3.js';
import { getLoanHistory } from '../services/database';
import redis, { CacheExpiryType } from '../services/redis/redis';
import { PythPrice, PythPriceService } from '../services/price/PythPriceService';
import { getConfigByCluster } from '@hubbleprotocol/hubble-config';
import { getLoanHistoryRedisKey, getLoanRedisKey, getLoansRedisKey } from '../services/redis/keyProvider';
import { LOANS_EXPIRY_IN_SECONDS } from '../constants/redis';
import logger from '../services/logger';
import { middleware } from './middleware/middleware';
import TokenCollateral from '../models/api/TokenCollateral';

/**
 * Get live Hubble on-chain loan data
 */
const loansRoute = Router();

/**
 * Get all loans
 */
loansRoute.get(
  '/',
  middleware.validateSolanaCluster,
  async (
    request: Request<
      never,
      LoanResponse[] | string,
      never,
      EnvironmentQueryParams & { includeJsonResponse: string | undefined }
    >,
    response
  ) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';
    const includeJsonResponse =
      (!!request.query.includeJsonResponse || request.query.includeJsonResponse === '') ?? false;

    const redisKey = getLoansRedisKey(env, includeJsonResponse);

    try {
      const loans = await redis.cacheFetchJson(redisKey, () => fetchAllLoans(env, includeJsonResponse), {
        cacheExpiryType: CacheExpiryType.ExpireInSeconds,
        cacheExpirySeconds: LOANS_EXPIRY_IN_SECONDS,
      });
      await sendWithCacheControl(redisKey, response, loans);
    } catch (e) {
      logger.error(e);
      response.status(internalError).send('Could not get loans');
    }
  }
);

async function fetchAllLoans(env: ENV, includeJsonResponse: boolean) {
  let web3Client: Web3Client = new Web3Client(env);
  const hubbleSdk = new Hubble(env, web3Client.connection);
  const config = getConfigByCluster(env);
  const pythService = new PythPriceService(web3Client, config);

  const responses = await Promise.all([
    pythService.getTokenPrices(),
    includeJsonResponse ? hubbleSdk.getAllUserMetadatasIncludeJsonResponse() : hubbleSdk.getAllUserMetadatas(),
  ]);

  const pythPrices: PythPrice[] = responses[0];
  const userVaults = responses[1];
  return getLoansFromUserVaults(userVaults, pythPrices);
}

export interface LoansParameters {
  pubkey: string;
}

type HistoryQueryParams = {
  env: ENV | undefined;
  from: string | undefined;
  to: string | undefined;
};

/**
 * Get history of a specific loan
 */
loansRoute.get(
  '/:pubkey/history',
  middleware.validateSolanaCluster,
  async (request: Request<LoansParameters, LoanHistoryResponse[] | string, never, HistoryQueryParams>, response) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';
    const loan = tryGetPublicKeyFromString(request.params.pubkey);
    if (!loan) {
      response.status(badRequest).send(`could not parse public key from: ${request.params.pubkey}`);
      return;
    }

    let from = new Date();
    from.setMonth(from.getMonth() - 1); //by default only return historical data for the past month
    let fromEpoch: number = request.query.from ? +request.query.from : from.valueOf();
    let toEpoch: number = request.query.to ? +request.query.to : new Date().valueOf();
    if (fromEpoch > toEpoch) {
      response
        .status(badRequest)
        .send(`Start date (epoch: ${fromEpoch}) can not be bigger than end date (epoch: ${toEpoch})`);
      return;
    }

    const expireAt = getNextSnapshotDate();
    const key = getLoanHistoryRedisKey(loan, env);

    try {
      const history = await redis.cacheFetchJson(key, () => getLoanHistory(loan, env), {
        cacheExpiryType: CacheExpiryType.ExpireAtDate,
        cacheExpireAt: expireAt,
      });
      await sendFilteredHistory(history, fromEpoch, toEpoch, response, key);
    } catch (e) {
      logger.error(e);
      response.status(internalError).send(`Could not get loan history for ${request.params.pubkey}`);
    }
  }
);

function sendFilteredHistory(
  history: LoanHistoryResponse[],
  fromEpoch: number,
  toEpoch: number,
  response: Response<LoanHistoryResponse[] | string>,
  redisKey: string
) {
  const filtered = history.filter((x) => x.epoch >= fromEpoch && x.epoch <= toEpoch);
  return sendWithCacheControl(redisKey, response, filtered);
}

/**
 * Get a specific loan
 */
loansRoute.get(
  '/:pubkey',
  middleware.validateSolanaCluster,
  async (request: Request<LoansParameters, LoanResponse | string, never, EnvironmentQueryParams>, response) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';
    const loanPubkey = tryGetPublicKeyFromString(request.params.pubkey);
    if (!loanPubkey) {
      response.status(badRequest).send(`Could not parse public key from: ${request.params.pubkey}`);
      return;
    }

    const key = getLoanRedisKey(loanPubkey, env);
    try {
      const loan = await redis.cacheFetchJson(key, () => getLoan(env, loanPubkey), {
        cacheExpiryType: CacheExpiryType.ExpireInSeconds,
        cacheExpirySeconds: LOANS_EXPIRY_IN_SECONDS,
      });
      if (loan) {
        await sendWithCacheControl(key, response, loan);
      } else {
        response.status(notFound).send(`Could not get loan for public key: ${request.params.pubkey}`);
      }
    } catch (e) {
      response.status(internalError).send(`Could not get loan for public key: ${request.params.pubkey}`);
    }
  }
);

async function getLoan(env: ENV, loanPubkey: PublicKey) {
  let web3Client: Web3Client = new Web3Client(env);
  const hubbleSdk = new Hubble(env, web3Client.connection);
  const config = getConfigByCluster(env);
  const pythService = new PythPriceService(web3Client, config);

  const responses = await Promise.all([pythService.getTokenPrices(), hubbleSdk.getUserMetadata(loanPubkey)]);

  const pythPrices: PythPrice[] = responses[0];
  const userVault: UserMetadata | undefined = responses[1];
  if (userVault) {
    return getLoanFromUserVault(userVault, pythPrices);
  }
  return null;
}

function getLoanFromUserVault(userVault: UserMetadata | UserMetadataWithJson, pythPrices: PythPrice[]) {
  const borrowedStablecoin = userVault.borrowedStablecoin.dividedBy(STABLECOIN_DECIMALS);
  let collateralTotal = new Decimal(0);
  const collateralTotals: TokenCollateral[] = [];
  for (const token of CollateralTokens) {
    const coll = getTokenCollateral(token, userVault.depositedCollateral, userVault.inactiveCollateral, pythPrices);
    collateralTotals.push(coll);
    collateralTotal = collateralTotal.add(coll.deposited.mul(coll.price));
  }
  const collRatio = calculateCollateralRatio(borrowedStablecoin, collateralTotal);
  const ltv = new Decimal(100).dividedBy(collRatio);

  const loan = {
    loanToValue: ltv,
    totalCollateralValue: collateralTotal,
    collateral: collateralTotals.map((x) => ({
      token: x.token.name,
      price: x.price,
      inactive: x.inactive,
      deposited: x.deposited,
    })),
    collateralRatio: collRatio,
    usdhDebt: borrowedStablecoin,
    metadataPk: userVault.metadataPk,
    owner: userVault.owner,
    status: userVault.status,
    userId: userVault.userId,
    borrowingMarketState: userVault.borrowingMarketState,
    version: userVault.version,
  } as LoanResponseWithJson;
  if (userVault.hasOwnProperty('jsonResponse')) {
    loan.jsonResponse = (userVault as UserMetadataWithJson).jsonResponse;
  }
  return loan;
}

export function getLoansFromUserVaults(userVaults: UserMetadata[] | UserMetadataWithJson[], pythPrices: PythPrice[]) {
  const loans: LoanResponse | LoanResponseWithJson[] = [];
  for (const userVault of userVaults.filter((x) => x.borrowedStablecoin.greaterThan(0))) {
    const loan = getLoanFromUserVault(userVault, pythPrices);
    loans.push(loan);
  }
  return loans;
}

export default loansRoute;
