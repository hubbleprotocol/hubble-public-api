import { Handler } from '@netlify/functions';
import { BorrowingClient } from '../../services/hubble/BorrowingClient';
import { HBB_DECIMALS, STABLECOIN_DECIMALS } from '../../constants/math';
import { getMockResponse } from '../../models/api/MetricsResponse';
import { createSerumMarketService } from '../../services/serum/SerumMarketService';
import { ENV, Web3Client } from '../../services/web3/client';
import * as hdr from 'hdr-histogram-js';
import { MINT_ADDRESSES, SUPPORTED_TOKENS } from '../../constants/tokens';
import { internalError, ok, unprocessable } from '../../utils/apiUtils';
import { getPercentiles } from '../../utils/histogramUtils';
import { OrcaPriceService } from '../../services/price/OrcaPriceService';
import {
  calculateCollateralRatio,
  calculateStabilityProvided,
  getTokenCollateral,
  getTotalCollateral,
} from '../../utils/calculations';
import { SaberPriceService } from '../../services/price/SaberPriceService';

export const handler: Handler = async (event, context) => {
  let env: ENV = 'mainnet-beta';
  if (event?.queryStringParameters?.env) {
    env = event.queryStringParameters.env as ENV;
  }

  let web3Client: Web3Client;
  try {
    web3Client = new Web3Client(env);
  } catch (e) {
    const error = e as Error;
    console.error(error);
    return unprocessable(error.message);
  }

  const loansHistogram = hdr.build();
  const collateralHistogram = hdr.build();
  const stabilityHistogram = hdr.build();

  try {
    const borrowingClient = new BorrowingClient(web3Client.connection, env);
    const serumService = createSerumMarketService();
    const orcaService = new OrcaPriceService();
    const saberService = new SaberPriceService();

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

    //TODO: add other stats and remove mock
    let response = getMockResponse();

    // collateral
    response.collateral.total = collateral.total;
    response.collateral.inactive = collateral.inactive;
    response.collateral.deposited = collateral.deposited;
    response.collateral.depositedTokens = collateral.tokens.map((x) => ({
      name: x.token,
      amount: x.deposited,
      price: x.price,
    }));
    response.collateral.ratioDistribution = getPercentiles(collateralHistogram)
      .filter((x) => x.value > 0)
      .map((x) => {
        x.value /= 100;
        return x;
      });
    response.collateral.collateralRatio = calculateCollateralRatio(
      borrowingMarketState.stablecoinBorrowed / STABLECOIN_DECIMALS,
      collateral.deposited
    );

    // hbb
    response.hbb.staked = totalHbbStaked;
    response.hbb.numberOfStakers = stakingPool.numUsers.toNumber();
    response.hbb.price = hbbPrice;
    response.hbb.issued = hbbMint.uiAmount as number;
    response.hbb.numberOfHolders = hbbProgramAccounts.length;
    //todo: after snapshots are added to DB
    // response.hbb.holdersHistory
    // response.hbb.priceHistory

    response.revenue = stakingPool.totalDistributedRewards / 0.85 / HBB_DECIMALS;

    // borrowing
    response.borrowing.numberOfBorrowers = borrowers.size;
    response.borrowing.treasury = treasuryVault.uiAmount as number;
    response.borrowing.loans.distribution = getPercentiles(loansHistogram);
    response.borrowing.loans.total = loansHistogram.totalCount;
    response.borrowing.loans.max = loansHistogram.maxValue;
    response.borrowing.loans.min = loansHistogram.totalCount > 0 ? loansHistogram.minNonZeroValue : 0;
    response.borrowing.loans.average = loansHistogram.mean;
    response.borrowing.loans.median = loansHistogram.getValueAtPercentile(50);
    //todo: after snapshots are added to DB
    // response.borrowing.loans.history
    // response.borrowing.borrowersHistory

    //usdh
    response.usdh.stabilityPool = totalUsdh;
    // response.usdh.issuedHistory
    response.usdh.stabilityPoolDistribution = getPercentiles(stabilityHistogram);
    response.usdh.issued = borrowingMarketState.stablecoinBorrowed / STABLECOIN_DECIMALS;
    const saberStats = await saberService.getStats();
    response.usdh.saber = {
      price: saberStats.price,
      liquidityPool: saberStats.liquidityPool,
    };
    //TODO
    // response.usdh.mercurialLiquidityPool
    // response.usdh.mercurialPrice

    //circulating supply
    response.circulatingSupplyValue = (hbbMint.uiAmount as number) * hbbPrice;

    //tvl
    response.totalValueLocked = totalHbbStaked * hbbPrice + collateral.total + totalUsdh;

    return ok(response);
  } catch (e) {
    console.error(e);
    if (e instanceof Error) {
      return internalError(e.message);
    } else {
      return internalError(`Internal Server Error: ${e}`);
    }
  } finally {
    loansHistogram.destroy();
    stabilityHistogram.destroy();
    collateralHistogram.destroy();
  }
};
