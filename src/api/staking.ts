import Router from 'express-promise-router';
import { Request, Response } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import {
  badRequest,
  internalError,
  parseFromQueryParams,
  sendWithCacheControl,
  unprocessable,
} from '../utils/apiUtils';
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
import {
  LIDO_ELIGIBLE_LOANS_EXPIRY_IN_SECONDS,
  LOANS_EXPIRY_IN_SECONDS,
  STAKING_STATS_EXPIRY_IN_SECONDS,
} from '../constants/redis';
import {
  getHbbStakersRedisKey,
  getLidoEligibleLoansRedisKey,
  getLidoStakingRedisKey,
  getLoansRedisKey,
  getMetricsRedisKey,
  getStakingRedisKey,
  getUsdhStakersRedisKey,
} from '../services/redis/keyProvider';
import { getLidoEligibleLoans, getMetricsBetween } from '../services/database';
import { middleware } from './middleware/middleware';
import { Scope, ScopeToken } from '@hubbleprotocol/scope-sdk';
import { LidoResponse } from '../models/api/LidoResponse';
import { fetchAllLoans } from './loans';
import { getLoanCollateralDistribution } from '../utils/calculations';
import EligibleLoansResponse from '../models/api/EligibleLoansResponse';
import { subtractDays } from '../utils/dateUtils';

/**
 * Get staking stats of HBB and USDH (APR+APY)
 */
const stakingRoute = Router();
stakingRoute.get(
  '/',
  middleware.validateSolanaCluster,
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
          await sendWithCacheControl(redisKey, response, staking);
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
 * Get LIDO rewards stats
 */
stakingRoute.get(
  '/lido',
  middleware.validateSolanaCluster,
  async (request: Request<never, LidoResponse | string, never, EnvironmentQueryParams>, response) => {
    const [web3Client, env, error] = parseFromQueryParams(request.query);
    if (web3Client && env) {
      const redisKey = getLidoStakingRedisKey(env);
      try {
        const lidoRewards = await redis.cacheFetchJson(redisKey, () => fetchLidoRewards(env, web3Client), {
          cacheExpiryType: CacheExpiryType.ExpireInSeconds,
          cacheExpirySeconds: STAKING_STATS_EXPIRY_IN_SECONDS,
        });
        await sendWithCacheControl(redisKey, response, lidoRewards);
      } catch (e) {
        logger.error(e);
        response.status(internalError).send('Could not get staking stats for lido rewards');
      }
    } else {
      response.status(unprocessable).send(error);
    }
  }
);

/**
 * Get all loans that are eligible for LDO rewards
 */
stakingRoute.get(
  '/lido/eligible-loans',
  middleware.authorizedRoute,
  middleware.validateSolanaCluster,
  async (request, response) => {
    if ((request.query.start && !request.query.end) || (!request.query.start && request.query.end)) {
      response.status(badRequest).send('You must specify both start and end query params or none of them.');
      return;
    }
    const startDate = request.query.start ? new Date(request.query.start as string) : subtractDays(new Date(), 14);
    const endDate = request.query.end ? new Date(request.query.end as string) : new Date();
    if (startDate >= endDate) {
      response.status(badRequest).send('Start date must occur before end date.');
      return;
    }

    const [web3Client, env, error] = parseFromQueryParams({ env: request.query.env as ENV });
    if (web3Client && env) {
      const redisKey = getLidoEligibleLoansRedisKey(env, startDate, endDate);
      try {
        const eligibleLoans = await redis.cacheFetchJson(redisKey, () => fetchEligibleLoans(env, startDate, endDate), {
          cacheExpiryType: CacheExpiryType.ExpireInSeconds,
          cacheExpirySeconds: LIDO_ELIGIBLE_LOANS_EXPIRY_IN_SECONDS,
        });
        await sendWithCacheControl(redisKey, response, {
          eligibleLoans: eligibleLoans.map((x) => x.user_metadata_pubkey),
        });
      } catch (e) {
        logger.error(e);
        response.status(internalError).send('Could not get eligible loans for lido rewards');
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
  middleware.validateSolanaCluster,
  async (request: Request<never, StakingUserResponse[] | string, never, EnvironmentQueryParams>, response) => {
    const [web3Client, env, error] = parseFromQueryParams(request.query);
    if (web3Client && env) {
      const redisKey = getHbbStakersRedisKey(env);
      try {
        const hbbStakers = await redis.cacheFetchJson(redisKey, () => fetchHbbStakers(env, web3Client), {
          cacheExpiryType: CacheExpiryType.ExpireInSeconds,
          cacheExpirySeconds: STAKING_STATS_EXPIRY_IN_SECONDS,
        });
        await sendWithCacheControl(redisKey, response, hbbStakers);
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
  middleware.validateSolanaCluster,
  async (request: Request<never, StakingUserResponse[] | string, never, EnvironmentQueryParams>, response) => {
    const [web3Client, env, error] = parseFromQueryParams(request.query);
    if (web3Client && env) {
      const redisKey = getUsdhStakersRedisKey(env);
      try {
        const usdhUsers = await redis.cacheFetchJson(redisKey, () => fetchUsdhStakers(env, web3Client), {
          cacheExpiryType: CacheExpiryType.ExpireInSeconds,
          cacheExpirySeconds: STAKING_STATS_EXPIRY_IN_SECONDS,
        });
        await sendWithCacheControl(redisKey, response, usdhUsers);
      } catch (e) {
        logger.error(e);
        response.status(internalError).send('Could not get HBB stakers');
      }
    } else {
      response.status(unprocessable).send(error);
    }
  }
);

async function fetchEligibleLoans(env: ENV, start: Date, end: Date) {
  return await getLidoEligibleLoans(env, start, end);
}

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

  const responses = await Promise.all([
    hubbleSdk.getGlobalConfig(),
    getMetrics(env, getMetricsRedisKey(env)),
    getMetricsBetween(env, from, to),
  ]);

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
  return globalConfig.issuancePerSecond
    .mul(60)
    .dividedBy(HBB_DECIMALS)
    .mul(minutesPerYear)
    .mul(new Decimal(metrics.hbb.price))
    .dividedBy(new Decimal(metrics.usdh.stabilityPool));
}

function aprToApy(apr: Decimal) {
  return apr.dividedBy(365).plus(1).pow(365).minus(1);
}

async function fetchLidoRewards(env: ENV, web3Client: Web3Client): Promise<LidoResponse> {
  const scope = new Scope(env, web3Client.connection);
  const ldoPrice = await scope.getPrice('LDO');
  const rewards = await calculateLidoRewards(ldoPrice, env);
  logger.info('calculated lido rewards %O', rewards);
  return rewards;
}

async function calculateLidoRewards(ldoPrice: ScopeToken, env: ENV) {
  // 1. get total investment
  // get hubble loans that have existed for the past 14 days, -14days from the latest snapshots
  // filter these loans on sql side:
  // - during these 14 days loans need to have had >= 40% LTV, otherwise they aren't eligible
  // - they also need to hold 40% of total collateral value in stSOL or wstETH
  // return sum of all USDH debt -> this will return total investment value
  const { totalInvestment, eligibleLoans } = await getLidoTotalInvestment(env);
  // 2. get total return:
  // - calculate daily reward by getting LDO price and multiply it by 150
  // - daily reward * 365 = total return value
  const totalReturn = calculateLidoTotalReturn(ldoPrice.price);
  // 3. APR = total return / total investment
  let apr = new Decimal(0);
  if (!totalInvestment.isZero()) {
    apr = new Decimal(totalReturn.dividedBy(totalInvestment));
  }

  return { apr: apr, apy: aprToApy(apr), totalInvestment, eligibleLoans: new Decimal(eligibleLoans), totalReturn };
}

/**
 * To get LIDO total returns we need to calculate daily reward by multiplying LDO price with 150 and 365.
 * @param ldoPrice
 */
function calculateLidoTotalReturn(ldoPrice: Decimal) {
  const dailyReward = ldoPrice.mul(150);
  return dailyReward.mul(365);
}

async function getLidoTotalInvestment(env: ENV) {
  const loans = await redis.cacheFetchJson(getLoansRedisKey(env, false), () => fetchAllLoans(env, false), {
    cacheExpiryType: CacheExpiryType.ExpireInSeconds,
    cacheExpirySeconds: LOANS_EXPIRY_IN_SECONDS,
    innerLockTimeoutMillis: 65_000,
    outerLockTimeoutMillis: 60_000,
  });

  let totalInvestment = new Decimal(0);
  let eligibleLoans = 0;
  for (const loan of loans) {
    const distribution = getLoanCollateralDistribution(loan);
    const stSol = distribution.find((x) => x.token.toLowerCase() === 'stsol')?.percentage || new Decimal(0);
    const wstEth = distribution.find((x) => x.token.toLowerCase() === 'wsteth')?.percentage || new Decimal(0);
    const totalLidoCollateralValue = stSol.plus(wstEth);
    //  >= 40% LTV, otherwise they aren't eligible
    // - they also need to hold 40% of total collateral value in stSOL or wstETH
    if (totalLidoCollateralValue.greaterThanOrEqualTo(0.4) && new Decimal(loan.loanToValue).greaterThanOrEqualTo(40)) {
      totalInvestment = totalInvestment.add(new Decimal(loan.usdhDebt));
      eligibleLoans++;
    }
  }
  return { totalInvestment, eligibleLoans };
}

export default stakingRoute;
