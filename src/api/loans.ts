import Router from 'express-promise-router';
import { Request, Response } from 'express';
import { ENV, Web3Client } from '../services/web3/client';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { badRequest, notFound } from '../utils/apiUtils';
import { tryGetPublicKeyFromString } from '../utils/tokenUtils';
import { MINT_ADDRESSES, SUPPORTED_TOKENS } from '../constants/tokens';
import { Hubble, UserMetadata, UserMetadataWithJson } from '@hubbleprotocol/hubble-sdk';
import Decimal from 'decimal.js';
import { calculateCollateralRatio, dateToUnixSeconds, getTokenCollateral } from '../utils/calculations';
import { STABLECOIN_DECIMALS } from '../constants/math';
import { createSerumMarketService } from '../services/serum/SerumMarketService';
import { SerumMarket } from '../models/SerumMarket';
import { LoanResponse, LoanResponseWithJson } from '../models/api/LoanResponse';
import { LoanHistoryResponse } from '../models/api/LoanHistoryResponse';
import { PublicKey } from '@solana/web3.js';
import { getLoanHistory } from '../services/database';
import RedisProvider from '../services/redis/redis';
import { HistoryQueryParams } from './history';

/**
 * Get live Hubble on-chain loan data
 */
const loansRoute = Router();

/**
 * Get all loans
 */
loansRoute.get(
  '/',
  async (
    request: Request<
      never,
      LoanResponse[],
      never,
      EnvironmentQueryParams & { includeJsonResponse: string | undefined }
    >,
    response
  ) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';
    const includeJsonResponse =
      (request.query.includeJsonResponse || request.query.includeJsonResponse === '') ?? false;

    let web3Client: Web3Client = new Web3Client(env);
    const hubbleSdk = new Hubble(env, web3Client.connection);
    const serumService = createSerumMarketService();

    const responses = await Promise.all([
      serumService.getMarkets(MINT_ADDRESSES, 'confirmed'),
      includeJsonResponse ? hubbleSdk.getAllUserMetadatasIncludeJsonResponse() : hubbleSdk.getAllUserMetadatas(),
    ]);

    const serumMarkets: Record<string, SerumMarket> = responses[0];
    const userVaults = responses[1];
    const loans = getLoansFromUserVaults(userVaults, serumMarkets);
    response.send(loans);
  }
);

export interface LoansParameters {
  pubkey: string;
}

/**
 * Get history of a specific loan
 */
loansRoute.get(
  '/:pubkey/history',
  async (request: Request<LoansParameters, LoanHistoryResponse[] | string, never, HistoryQueryParams>, response) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';
    let loan = tryGetPublicKeyFromString(request.params.pubkey);
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

    const redis = RedisProvider.getInstance();
    let history = await getCachedLoanHistory(env, loan, redis);
    if (!history) {
      const expireAt = new Date();
      expireAt.setHours(expireAt.getHours() + 1);
      expireAt.setMinutes(1);
      expireAt.setSeconds(0);
      const key = loanToRedisKey(loan, env);
      history = await getLoanHistory(loan, env);
      await redis.client.set(key, JSON.stringify(history));
      await redis.client.expireat(key, dateToUnixSeconds(expireAt));
    }

    const filtered = history.filter((x) => x.epoch >= fromEpoch && x.epoch <= toEpoch);
    response.send(filtered);
  }
);

async function getCachedLoanHistory(env: ENV, loan: PublicKey, redisClient: RedisProvider) {
  const loanHistory = await redisClient.client.get(loanToRedisKey(loan, env));
  if (loanHistory) {
    return JSON.parse(loanHistory) as LoanHistoryResponse[];
  }
  return undefined;
}

function loanToRedisKey(loan: PublicKey, env: ENV) {
  return `loan-${env}-${loan.toString()}`;
}

/**
 * Get a specific loan
 */
loansRoute.get(
  '/:pubkey',
  async (request: Request<LoansParameters, LoanResponse | string, never, EnvironmentQueryParams>, response) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';
    let loanPubkey = tryGetPublicKeyFromString(request.params.pubkey);
    if (!loanPubkey) {
      response.status(badRequest).send(`Could not parse public key from: ${request.params.pubkey}`);
      return;
    }

    let web3Client: Web3Client = new Web3Client(env);
    const hubbleSdk = new Hubble(env, web3Client.connection);
    const serumService = createSerumMarketService();

    const responses = await Promise.all([
      serumService.getMarkets(MINT_ADDRESSES, 'confirmed'),
      getUserMetadata(loanPubkey, hubbleSdk, response),
    ]);

    const serumMarkets: Record<string, SerumMarket> = responses[0];
    const userVault: UserMetadata | undefined = responses[1];
    if (userVault) {
      const loan = getLoanFromUserVault(userVault, serumMarkets);
      response.send(loan);
    }
  }
);

async function getUserMetadata(pubkey: PublicKey, hubbleSdk: Hubble, response: Response) {
  try {
    return await hubbleSdk.getUserMetadata(pubkey);
  } catch (e) {
    if (e instanceof Error && e.message.includes('Account does not exist')) {
      response.status(notFound).send(e.message);
    } else {
      throw e;
    }
  }
}

function getLoanFromUserVault(
  userVault: UserMetadata | UserMetadataWithJson,
  serumMarkets: Record<string, SerumMarket>
) {
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

  const loan = {
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
  } as LoanResponseWithJson;
  if (userVault.hasOwnProperty('jsonResponse')) {
    loan.jsonResponse = (userVault as UserMetadataWithJson).jsonResponse;
  }
  return loan;
}

export function getLoansFromUserVaults(
  userVaults: UserMetadata[] | UserMetadataWithJson[],
  serumMarkets: Record<string, SerumMarket>
) {
  const loans: LoanResponse | LoanResponseWithJson[] = [];
  for (const userVault of userVaults.filter((x) => x.borrowedStablecoin.greaterThan(0))) {
    const loan = getLoanFromUserVault(userVault, serumMarkets);
    loans.push(loan);
  }
  return loans;
}

export default loansRoute;
