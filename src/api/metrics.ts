import { BorrowingClient } from '../services/hubble/BorrowingClient';
import { HBB_DECIMALS, STABLECOIN_DECIMALS } from '../constants/math';
import { MetricsResponse } from '../models/api/MetricsResponse';
import { createSerumMarketService } from '../services/serum/SerumMarketService';
import { ENV, Web3Client } from '../services/web3/client';
import * as hdr from 'hdr-histogram-js';
import { MINT_ADDRESSES, SUPPORTED_TOKENS } from '../constants/tokens';
import { getPercentiles } from '../utils/histogramUtils';
import { OrcaPriceService } from '../services/price/OrcaPriceService';
import {
  calculateCollateralRatio,
  calculateStabilityProvided,
  getTokenCollateral,
  getTotalCollateral,
} from '../utils/calculations';
import { SaberPriceService } from '../services/price/SaberPriceService';
import { JupiterPriceService } from '../services/price/JupiterPriceService';
import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';

/**
 * Get live Hubble on-chain metrics data
 */
const historyRoute = Router();
historyRoute.get('/', async (request: Request<never, MetricsResponse, never, EnvironmentQueryParams>, response) => {
  let env: ENV = request.query.env ?? 'mainnet-beta';
  const metrics = await getMetrics(env);
  response.send(metrics);
});

export default historyRoute;

async function getMetrics(env: ENV): Promise<MetricsResponse> {
  let web3Client: Web3Client = new Web3Client(env);

  const loansHistogram = hdr.build();
  const collateralHistogram = hdr.build();
  const stabilityHistogram = hdr.build();

  try {
    const borrowingClient = new BorrowingClient(web3Client.connection, env);
    const serumService = createSerumMarketService();
    const orcaService = new OrcaPriceService();
    const saberService = new SaberPriceService();
    const jupiterService = new JupiterPriceService();

    const borrowingMarketState = await borrowingClient.getBorrowingMarketState();
    const markets = await serumService.getMarkets(MINT_ADDRESSES, 'confirmed');
    const collateral = await getTotalCollateral(markets, borrowingMarketState);

    const hbbPrice = (await orcaService.getHbbPrice()).getRate().toNumber();

    const userVaults = await borrowingClient.getUserVaults();
    const borrowers = new Set<string>();

    for (const userVault of userVaults.filter((x) => x.borrowedStablecoin > 0)) {
      loansHistogram.recordValue(userVault.borrowedStablecoin / STABLECOIN_DECIMALS);
      borrowers.add(userVault.owner.toString());

      let collateralTotal = 0;
      for (const token of SUPPORTED_TOKENS) {
        const coll = getTokenCollateral(token, userVault.depositedCollateral, userVault.inactiveCollateral, markets);
        collateralTotal += coll.deposited * coll.price;
      }
      const collRatio = calculateCollateralRatio(userVault.borrowedStablecoin / STABLECOIN_DECIMALS, collateralTotal);
      //we record the value in %, histograms don't work well with decimals so this way it's easier
      collateralHistogram.recordValue(collRatio * 100);
    }

    const stakingPool = await borrowingClient.getStakingPoolState();
    const totalHbbStaked = stakingPool.totalStake / HBB_DECIMALS;

    const stabilityPool = await borrowingClient.getStabilityPoolState();
    const stabilityProviders = await borrowingClient.getStabilityProviders();
    const totalUsdh = stabilityPool.stablecoinDeposited / STABLECOIN_DECIMALS;

    for (const stabilityProvider of stabilityProviders) {
      const stabilityProvided = calculateStabilityProvided(stabilityPool, stabilityProvider);
      if (stabilityProvided > 0) {
        stabilityHistogram.recordValue(stabilityProvided / STABLECOIN_DECIMALS);
      }
    }

    const treasuryVault = await borrowingClient.getTreasuryVault();
    const hbbMint = await borrowingClient.getHbbMintAccount();

    const hbbProgramAccounts = await borrowingClient.getHbbProgramAccounts();

    const saberStats = await saberService.getStats();
    const jupiterStats = await jupiterService.getStats();

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
          .filter((x) => x.value > 0)
          .map((x) => {
            x.value /= 100;
            return x;
          }),
        collateralRatio: calculateCollateralRatio(
          borrowingMarketState.stablecoinBorrowed / STABLECOIN_DECIMALS,
          collateral.deposited
        ),
      },
      hbb: {
        staked: totalHbbStaked,
        numberOfStakers: stakingPool.numUsers.toNumber(),
        price: hbbPrice,
        issued: hbbMint.uiAmount as number,
        numberOfHolders: hbbProgramAccounts.length,
      },
      revenue: stakingPool.totalDistributedRewards / 0.85 / HBB_DECIMALS,
      borrowing: {
        numberOfBorrowers: borrowers.size,
        treasury: treasuryVault.uiAmount as number,
        loans: {
          distribution: getPercentiles(loansHistogram),
          total: loansHistogram.totalCount,
          max: loansHistogram.maxValue,
          min: loansHistogram.totalCount > 0 ? loansHistogram.minNonZeroValue : 0,
          average: loansHistogram.mean,
          median: loansHistogram.getValueAtPercentile(50),
        },
      },
      usdh: {
        stabilityPool: totalUsdh,
        stabilityPoolDistribution: getPercentiles(stabilityHistogram),
        issued: borrowingMarketState.stablecoinBorrowed / STABLECOIN_DECIMALS,
        jupiter: {
          price: jupiterStats.price,
          liquidityPool: jupiterStats.liquidityPool,
        },
        saber: {
          price: saberStats.price,
          liquidityPool: saberStats.liquidityPool,
        },
      },
      circulatingSupplyValue: (hbbMint.uiAmount as number) * hbbPrice,
      totalValueLocked: totalHbbStaked * hbbPrice + collateral.total + totalUsdh,
    };
  } finally {
    loansHistogram.destroy();
    stabilityHistogram.destroy();
    collateralHistogram.destroy();
  }
}
