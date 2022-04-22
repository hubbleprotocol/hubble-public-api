import Router from 'express-promise-router';
import { Request, Response } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { internalError, parseFromQueryParams, unprocessable } from '../utils/apiUtils';
import { Hubble } from '@hubbleprotocol/hubble-sdk';
import { StakingResponse } from '../models/api/StakingResponse';
import { getHistory } from './history';
import logger from '../services/logger';
import Decimal from 'decimal.js';
import { getMetrics } from './metrics';
import GlobalConfig from '@hubbleprotocol/hubble-sdk/dist/models/GlobalConfig';
import { MetricsResponse } from '../models/api/MetricsResponse';
import { HBB_DECIMALS } from '../constants/math';
import { ENV, Web3Client } from '../services/web3/client';
import RedisProvider from '../services/redis';

/**
 * Get staking stats of HBB and USDH (APR+APY)
 */
const stakingRoute = Router();
stakingRoute.get(
  '/',
  async (request: Request<never, StakingResponse[] | string, never, EnvironmentQueryParams>, response) => {
    const [web3Client, env, error] = parseFromQueryParams(request.query);
    if (web3Client && env) {
      let staking = await getCachedStaking(env);
      if (staking) {
        response.send(staking);
      } else {
        staking = await fetchStaking(env, web3Client, response);
        if (staking) {
          await saveStakingToCache(env, staking);
          response.send(staking);
        }
      }
    } else {
      response.status(unprocessable).send(error);
    }
  }
);

async function fetchStaking(
  env: ENV,
  web3Client: Web3Client,
  response: Response
): Promise<StakingResponse[] | undefined> {
  const hubbleSdk = new Hubble(env, web3Client.connection);

  const from = new Date();
  from.setDate(from.getDate() - 7);
  from.setMinutes(0);
  from.setSeconds(0);
  const to = new Date(from);
  to.setMinutes(5);

  const responses = await Promise.all([
    hubbleSdk.getGlobalConfig(),
    getMetrics(env),
    getHistory(env, from.valueOf(), to.valueOf()),
  ]);

  const globalConfig = responses[0];
  const metrics = responses[1];
  const history = responses[2];

  if (history.metrics.length === 0) {
    logger.error(history.body);
    response.status(internalError).send('Could not get historical treasury vault data');
    return;
  }
  const treasuryWeekAgo = history.metrics[0].metrics.borrowing.treasury;
  const hbbApr = calculateHbbApr(
    new Decimal(metrics.borrowing.treasury),
    treasuryWeekAgo,
    new Decimal(metrics.hbb.staked),
    new Decimal(metrics.hbb.price)
  );
  const usdhApr = calculateUsdhApr(globalConfig, metrics);
  return [
    {
      name: 'HBB',
      apr: hbbApr,
      apy: aprToApy(hbbApr),
      tvl: new Decimal(metrics.hbb.staked).mul(new Decimal(metrics.hbb.price)),
    },
    { name: 'USDH', apr: usdhApr, apy: aprToApy(usdhApr), tvl: metrics.usdh.stabilityPool },
  ];
}

async function saveStakingToCache(env: ENV, staking: StakingResponse[]) {
  const redis = RedisProvider.getInstance().client;
  const key = getStakingRedisKey(env);
  const expireInSeconds = 5 * 60;
  await redis.multi().set(key, JSON.stringify(staking)).expire(key, expireInSeconds).exec();
}

async function getCachedStaking(env: ENV) {
  const redis = RedisProvider.getInstance().client;
  const key = getStakingRedisKey(env);
  const staking = await redis.get(key);
  if (staking) {
    return JSON.parse(staking) as StakingResponse[];
  }
  return undefined;
}

function getStakingRedisKey(env: ENV) {
  return `staking-${env}`;
}

/**
 * Calculate HBB APR. How we calculate HBB APR:
 * treasury vault represents 15% of our total borrowing fees, so we take calculate the sum of borrowing fees in the last 7 days:
 * sum_borrowing_fees = (treasury_vault - treasury_vault_7d_ago) * 85/15
 * calculate final APR:
 * HBB APR = (sum_borrowing_fees / 7 * 365) / (hbb_staked * hbb_price)`
 */
function calculateHbbApr(
  treasuryVaultNow: Decimal,
  treasuryVaultOneWeekAgo: Decimal,
  totalHbbStaked: Decimal,
  hbbPrice: Decimal
) {
  logger.debug('treasury vault now %d', treasuryVaultNow);
  logger.debug('treasury vault 7d ago %d', treasuryVaultOneWeekAgo);
  const sumBorrowingFees = treasuryVaultNow.minus(treasuryVaultOneWeekAgo).mul(85).dividedBy(15);
  logger.debug('sum borrowing fees %d', sumBorrowingFees);
  logger.debug('borr fees divided by 7*365: %d', sumBorrowingFees.dividedBy(7).mul(365));
  logger.debug('total hbb staked %d', totalHbbStaked);
  logger.debug('hbb price %d', hbbPrice);
  logger.debug('hbb price * staked %d', totalHbbStaked.mul(hbbPrice));

  return sumBorrowingFees.dividedBy(7).mul(365).dividedBy(totalHbbStaked.mul(hbbPrice));
}

function calculateUsdhApr(globalConfig: GlobalConfig, metrics: MetricsResponse) {
  const minutesPerYear = 365 * 24 * 60;
  return globalConfig.issuancePerMinute
    .dividedBy(HBB_DECIMALS)
    .mul(minutesPerYear)
    .mul(new Decimal(metrics.hbb.price))
    .dividedBy(new Decimal(metrics.usdh.stabilityPool));
}

function aprToApy(apr: Decimal) {
  return apr.dividedBy(365).plus(1).pow(365).minus(1);
}

export default stakingRoute;
