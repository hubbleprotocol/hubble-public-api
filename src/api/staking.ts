import Router from 'express-promise-router';
import { Request, Response } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { internalError, parseFromQueryParams, unprocessable } from '../utils/apiUtils';
import { Hubble } from '@hubbleprotocol/hubble-sdk';
import { StakingResponse } from '../models/api/StakingResponse';
import logger from '../services/logger';
import Decimal from 'decimal.js';
import { getMetrics } from './metrics';
import GlobalConfig from '@hubbleprotocol/hubble-sdk/dist/models/GlobalConfig';
import { MetricsResponse } from '../models/api/MetricsResponse';
import { HBB_DECIMALS, STABLECOIN_DECIMALS } from '../constants/math';
import { ENV, Web3Client } from '../services/web3/client';
import redis, { CacheExpiryType } from '../services/redis/redis';
import { StakingUserResponse } from '../models/api/StakingUserResponse';
import { groupBy } from '../utils/arrayUtils';
import { PublicKey } from '@solana/web3.js';
import { STAKING_STATS_EXPIRY_IN_SECONDS } from '../constants/redis';
import { getHbbStakersRedisKey, getStakingRedisKey, getUsdhStakersRedisKey } from '../services/redis/keyProvider';
import { getMetricsBetween } from '../services/database';

/**
 * Get staking stats of HBB and USDH (APR+APY)
 */
const stakingRoute = Router();
stakingRoute.get(
  '/',
  async (request: Request<never, StakingResponse[] | string, never, EnvironmentQueryParams>, response) => {
    const [web3Client, env, error] = parseFromQueryParams(request.query);
    if (web3Client && env) {
      const redisKey = getStakingRedisKey(env);
      try {
        const staking = await redis.cacheFetchJson(redisKey, () => fetchStaking(env, web3Client, response), {
          cacheExpiryType: CacheExpiryType.ExpireInSeconds,
          cacheExpirySeconds: STAKING_STATS_EXPIRY_IN_SECONDS,
        });
        if (staking) {
          response.send(staking);
        }
      } catch (e) {
        logger.error(e);
        response.status(internalError).send('Could not get staking stats');
      }
    } else {
      response.status(unprocessable).send(error);
    }
  }
);

/**
 * Get all HBB stakers
 */
stakingRoute.get(
  '/hbb/users',
  async (request: Request<never, StakingUserResponse[] | string, never, EnvironmentQueryParams>, response) => {
    const [web3Client, env, error] = parseFromQueryParams(request.query);
    if (web3Client && env) {
      const redisKey = getHbbStakersRedisKey(env);
      try {
        const hbbStakers = await redis.cacheFetchJson(redisKey, () => fetchHbbStakers(env, web3Client), {
          cacheExpiryType: CacheExpiryType.ExpireInSeconds,
          cacheExpirySeconds: STAKING_STATS_EXPIRY_IN_SECONDS,
        });
        response.send(hbbStakers);
      } catch (e) {
        logger.error(e);
        response.status(internalError).send('Could not get HBB stakers');
      }
    } else {
      response.status(unprocessable).send(error);
    }
  }
);

/**
 * Get all USDH stakers
 */
stakingRoute.get(
  '/usdh/users',
  async (request: Request<never, StakingUserResponse[] | string, never, EnvironmentQueryParams>, response) => {
    const [web3Client, env, error] = parseFromQueryParams(request.query);
    if (web3Client && env) {
      const redisKey = getUsdhStakersRedisKey(env);
      try {
        const usdhUsers = await redis.cacheFetchJson(redisKey, () => fetchUsdhStakers(env, web3Client), {
          cacheExpiryType: CacheExpiryType.ExpireInSeconds,
          cacheExpirySeconds: STAKING_STATS_EXPIRY_IN_SECONDS,
        });
        response.send(usdhUsers);
      } catch (e) {
        logger.error(e);
        response.status(internalError).send('Could not get HBB stakers');
      }
    } else {
      response.status(unprocessable).send(error);
    }
  }
);

async function fetchHbbStakers(env: ENV, web3Client: Web3Client) {
  const hbbStakers: StakingUserResponse[] = [];
  const hubbleSdk = new Hubble(env, web3Client.connection);
  const userStakingStates = await hubbleSdk.getUserStakingStates();
  for (const [user, stakingStates] of groupBy(userStakingStates, (x) => x.owner.toBase58())) {
    let totalStaked = new Decimal(0);
    for (const stakingState of stakingStates) {
      totalStaked = totalStaked.add(stakingState.userStake.dividedBy(HBB_DECIMALS));
    }
    hbbStakers.push({ user: new PublicKey(user), staked: totalStaked });
  }
  return hbbStakers;
}

async function fetchUsdhStakers(env: ENV, web3Client: Web3Client) {
  const usdhStakers: StakingUserResponse[] = [];
  const hubbleSdk = new Hubble(env, web3Client.connection);
  const stabilityProviderStates = (await hubbleSdk.getStabilityProviders()).filter((x) =>
    x.depositedStablecoin.greaterThan(0)
  );
  for (const [user, stabilityProviders] of groupBy(stabilityProviderStates, (x) => x.owner.toBase58())) {
    let totalStaked = new Decimal(0);
    for (const stabilityProvider of stabilityProviders) {
      totalStaked = totalStaked.add(stabilityProvider.depositedStablecoin.dividedBy(STABLECOIN_DECIMALS));
    }
    usdhStakers.push({ user: new PublicKey(user), staked: totalStaked });
  }
  return usdhStakers;
}

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
  to.setHours(from.getHours() + 2);

  const responses = await Promise.all([hubbleSdk.getGlobalConfig(), getMetrics(env), getMetricsBetween(env, from, to)]);

  const globalConfig = responses[0];
  const metrics = responses[1];
  const history = responses[2];

  if (history.length === 0) {
    logger.error({ message: 'Could not get historical treasury vault data', from: from.toString(), to: to.toString() });
    response.status(internalError).send('Could not get historical treasury vault data');
    return;
  }
  const treasuryWeekAgo = history.reduce((prev, curr) => (prev.createdOn < curr.createdOn ? prev : curr)).metrics
    .borrowing.treasury;
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
