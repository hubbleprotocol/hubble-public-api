import { HBB_DECIMALS, STABLECOIN_DECIMALS } from '../constants/math';
import { MetricsResponse } from '../models/api/MetricsResponse';
import { ENV, Web3Client } from '../services/web3/client';
import * as hdr from 'hdr-histogram-js';
import { SUPPORTED_TOKENS } from '../constants/tokens';
import { d3BinsToResponse, getPercentiles } from '../utils/histogramUtils';
import { OrcaPriceService } from '../services/price/OrcaPriceService';
import {
  calculateCollateralRatio,
  calculateStabilityProvided,
  getTokenCollateral,
  getTotalCollateral,
  maxMinAvg,
} from '../utils/calculations';
import { SaberPriceService } from '../services/price/SaberPriceService';
import { JupiterPriceService } from '../services/price/JupiterPriceService';
import Router from 'express-promise-router';
import { Request } from 'express';
import { PriceResponse } from '../models/api/PriceResponse';
import Decimal from 'decimal.js';
import {
  BorrowingMarketState,
  Hubble,
  StabilityPoolState,
  StabilityProviderState,
  StakingPoolState,
  UserMetadata,
} from '@hubbleprotocol/hubble-sdk';
import { bin } from 'd3-array';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import redis from '../services/redis/redis';
import { PythPrice, PythPriceService } from '../services/price/PythPriceService';
import { getConfigByCluster } from '@hubbleprotocol/hubble-config';
import { getMetricsLockKey, getMetricsRedisKey } from '../services/redis/keyProvider';
import { METRICS_EXPIRY_IN_SECONDS } from '../constants/redis';
import logger from '../services/logger';
import { internalError } from '../utils/apiUtils';
import Redlock from 'redlock';

/**
 * Get live Hubble on-chain metrics data
 */
const metricsRoute = Router();
metricsRoute.get(
  '/',
  async (request: Request<never, MetricsResponse | string, never, EnvironmentQueryParams>, response) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';
    try {
      let metrics = await getMetrics(env);
      response.send(metrics);
    } catch (e) {
      logger.error(e);
      response.status(internalError).send('Could not get metrics');
    }
  }
);

export default metricsRoute;

export async function getMetrics(env: ENV) {
  const bins = 20;
  const key = getMetricsRedisKey(env);
  let metrics = await redis.getAndParseKey<MetricsResponse>(key);
  if (!metrics) {
    const redlock = new Redlock([redis.client]);
    await redlock.using([getMetricsLockKey(env)], 10000, async (signal) => {
      metrics = await redis.getAndParseKey<MetricsResponse>(key);
      if (!metrics) {
        metrics = await fetchMetrics(env, bins);
        await redis.saveAsJsonWithExpiry(key, metrics, METRICS_EXPIRY_IN_SECONDS);
      }
    });
  }
  return metrics!;
}

async function fetchMetrics(env: ENV, numberOfBins: number): Promise<MetricsResponse> {
  let web3Client: Web3Client = new Web3Client(env);
  const config = getConfigByCluster(env);

  //TODO: build own histogram implementation that supports Decimal instead of number..
  // or find a lib that does this already
  const loansHistogram = hdr.build();
  const collateralHistogram = hdr.build();
  const stabilityHistogram = hdr.build();
  const loanBins: number[] = [];
  const collateralBins: number[] = [];
  const loanToValueBins: number[] = [];
  const stabilityBins: number[] = [];

  try {
    const hubbleSdk = new Hubble(env, web3Client.connection);
    const pythService = new PythPriceService(web3Client, config);
    const orcaService = new OrcaPriceService();
    const saberService = new SaberPriceService();
    const jupiterService = new JupiterPriceService();

    // none of these requests are dependent on each other, so just bulk GET everything
    // we use them in an array so we get type-safe array indexing later on, but order is important!
    const responses = await Promise.all([
      hubbleSdk.getBorrowingMarketState(),
      pythService.getTokenPrices(),
      orcaService.getHbbPrice(),
      hubbleSdk.getAllUserMetadatas(),
      hubbleSdk.getStakingPoolState(),
      hubbleSdk.getStabilityPoolState(),
      hubbleSdk.getStabilityProviders(),
      hubbleSdk.getTreasuryVault(),
      hubbleSdk.getHbbCirculatingSupply(),
      hubbleSdk.getHbbTokenAccounts(),
      saberService.getStats(),
      jupiterService.getStats(),
    ]);

    const timestamp = new Date().valueOf();

    const borrowingMarketState: BorrowingMarketState = responses[0];
    const pythPrices: PythPrice[] = responses[1];
    const hbbPrice: Decimal = responses[2].getRate();
    const userVaults: UserMetadata[] = responses[3];
    const stakingPool: StakingPoolState = responses[4];
    const stabilityPool: StabilityPoolState = responses[5];
    const stabilityProviders: StabilityProviderState[] = responses[6];
    const treasuryVault: Decimal = responses[7];
    const circulatingSupply: Decimal = responses[8];
    const hbbProgramAccounts = responses[9];
    const saberStats: PriceResponse = responses[10];
    const jupiterStats: PriceResponse = responses[11];

    const collateral = await getTotalCollateral(pythPrices, borrowingMarketState);
    const borrowers = new Set<string>();
    for (const userVault of userVaults.filter((x) => x.borrowedStablecoin.greaterThan(0))) {
      const borrowedStablecoin = userVault.borrowedStablecoin.dividedBy(STABLECOIN_DECIMALS);
      loansHistogram.recordValue(borrowedStablecoin.toNumber());
      loanBins.push(borrowedStablecoin.toNumber());
      borrowers.add(userVault.owner.toString());

      let collateralTotal = new Decimal(0);
      for (const token of SUPPORTED_TOKENS) {
        const coll = getTokenCollateral(token, userVault.depositedCollateral, userVault.inactiveCollateral, pythPrices);
        collateralTotal = collateralTotal.add(coll.deposited.mul(coll.price));
      }
      const collRatio = calculateCollateralRatio(borrowedStablecoin, collateralTotal);
      //we record the value in %, histograms don't work well with decimals so this way it's easier
      collateralHistogram.recordValue(collRatio.mul(100).toNumber());
      collateralBins.push(collRatio.toNumber());
      loanToValueBins.push(new Decimal(100).dividedBy(collRatio).toNumber());
    }

    const totalHbbStaked = stakingPool.totalStake.dividedBy(HBB_DECIMALS);
    const totalUsdh = stabilityPool.stablecoinDeposited.dividedBy(STABLECOIN_DECIMALS);

    for (const stabilityProvider of stabilityProviders) {
      const stabilityProvided = calculateStabilityProvided(stabilityPool, stabilityProvider);
      if (stabilityProvided.greaterThan(0)) {
        stabilityHistogram.recordValue(stabilityProvided.dividedBy(STABLECOIN_DECIMALS).toNumber());
        stabilityBins.push(stabilityProvided.dividedBy(STABLECOIN_DECIMALS).toNumber());
      }
    }

    const maxCollateralBin = maxMinAvg(collateralBins).max;
    const maxLoanBin = maxMinAvg(loanBins).max;
    const maxStabilityBin = maxMinAvg(stabilityBins).max;

    return {
      collateral: {
        total: collateral.total,
        inactive: collateral.inactive,
        deposited: collateral.deposited,
        depositedTokens: collateral.tokens.map((x) => ({
          name: x.token,
          amount: x.deposited,
          price: x.price,
        })),
        ratioDistribution: getPercentiles(collateralHistogram)
          .filter((x) => x.value.greaterThan(0))
          .map((x) => {
            x.value = x.value.dividedBy(100);
            return x;
          }),
        collateralRatio: calculateCollateralRatio(
          borrowingMarketState.stablecoinBorrowed.dividedBy(STABLECOIN_DECIMALS),
          collateral.deposited
        ),
        ratioBins: d3BinsToResponse(
          bin()
            .domain([0, maxCollateralBin])
            .thresholds(numberOfBins - 1)(collateralBins),
          {
            from: 0,
            to: maxCollateralBin,
          }
        ),
        ltvBins: d3BinsToResponse(
          bin()
            .domain([0, 100])
            .thresholds(numberOfBins - 1)(loanToValueBins),
          {
            from: 0,
            to: 100,
          }
        ),
      },
      hbb: {
        staked: totalHbbStaked,
        numberOfStakers: stakingPool.numUsers,
        price: hbbPrice,
        issued: circulatingSupply,
        numberOfHolders: hbbProgramAccounts.length,
      },
      revenue: stakingPool.totalDistributedRewards.dividedBy(0.85).dividedBy(HBB_DECIMALS),
      borrowing: {
        numberOfBorrowers: borrowers.size,
        treasury: treasuryVault,
        loans: {
          distribution: getPercentiles(loansHistogram),
          total: loansHistogram.totalCount,
          max: new Decimal(loansHistogram.maxValue),
          min: new Decimal(loansHistogram.totalCount > 0 ? loansHistogram.minNonZeroValue : 0),
          average: new Decimal(loansHistogram.mean),
          median: new Decimal(loansHistogram.getValueAtPercentile(50)),
          bins: d3BinsToResponse(
            bin()
              .domain([0, maxLoanBin])
              .thresholds(numberOfBins - 1)(loanBins),
            {
              from: 0,
              to: maxLoanBin,
            }
          ),
        },
      },
      usdh: {
        stabilityPool: totalUsdh,
        stabilityPoolDistribution: getPercentiles(stabilityHistogram),
        issued: borrowingMarketState.stablecoinBorrowed.dividedBy(STABLECOIN_DECIMALS),
        stabilityPoolBins: d3BinsToResponse(
          bin()
            .domain([0, maxStabilityBin])
            .thresholds(numberOfBins - 1)(stabilityBins),
          {
            from: 0,
            to: maxStabilityBin,
          }
        ),
        jupiter: {
          price: jupiterStats.price,
          liquidityPool: jupiterStats.liquidityPool,
        },
        saber: {
          price: saberStats.price,
          liquidityPool: saberStats.liquidityPool,
        },
      },
      circulatingSupplyValue: circulatingSupply.mul(hbbPrice),
      totalValueLocked: totalHbbStaked.mul(hbbPrice).plus(collateral.total).plus(totalUsdh),
      timestamp,
    };
  } finally {
    loansHistogram.destroy();
    stabilityHistogram.destroy();
    collateralHistogram.destroy();
  }
}
