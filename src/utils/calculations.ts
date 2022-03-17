import { SerumMarket } from '../models/SerumMarket';
import {
  BTC_MINT,
  ETH_MINT,
  FTT_MINT,
  MSOL_MINT,
  RAY_MINT,
  SOL_MINT,
  SRM_MINT,
  SUPPORTED_TOKENS,
  SupportedToken,
} from '../constants/tokens';
import { lamportsToCollateral } from './tokenUtils';
import { SCALE_FACTOR } from '../constants/math';
import Decimal from 'decimal.js';
import {
  BorrowingMarketState,
  CollateralAmounts,
  CollateralTotals,
  StabilityPoolState,
  StabilityProviderState,
} from '@hubbleprotocol/hubble-sdk';
import logger from '../services/logger';

export const getTokenCollateral = (
  token: SupportedToken,
  deposited: CollateralAmounts,
  inactive: CollateralAmounts,
  markets: Record<string, SerumMarket>
): CollateralTotals => {
  switch (token) {
    case 'BTC':
      return {
        deposited: lamportsToCollateral(deposited.btc, token),
        inactive: lamportsToCollateral(inactive.btc, token),
        price: markets[BTC_MINT].midPrice!,
        token: token,
      };
    case 'SRM':
      return {
        deposited: lamportsToCollateral(deposited.srm, token),
        inactive: lamportsToCollateral(inactive.srm, token),
        price: markets[SRM_MINT].midPrice!,
        token: token,
      };
    case 'ETH':
      return {
        deposited: lamportsToCollateral(deposited.eth, token),
        inactive: lamportsToCollateral(inactive.eth, token),
        price: markets[ETH_MINT].midPrice!,
        token: token,
      };
    case 'SOL':
      return {
        deposited: lamportsToCollateral(deposited.sol, token),
        inactive: lamportsToCollateral(inactive.sol, token),
        price: markets[SOL_MINT].midPrice!.mul(1000),
        token: token,
      };
    case 'FTT':
      return {
        deposited: lamportsToCollateral(deposited.ftt, token),
        inactive: lamportsToCollateral(inactive.ftt, token),
        price: markets[FTT_MINT].midPrice!,
        token: token,
      };
    case 'RAY':
      return {
        deposited: lamportsToCollateral(deposited.ray, token),
        inactive: lamportsToCollateral(inactive.ray, token),
        price: markets[RAY_MINT].midPrice!,
        token: token,
      };
    case 'mSOL':
      return {
        deposited: lamportsToCollateral(deposited.msol, token),
        inactive: lamportsToCollateral(inactive.msol, token),
        price: markets[MSOL_MINT].midPrice!.mul(1000),
        token: token,
      };
  }
};

export const getTotalCollateral = async (markets: Record<string, SerumMarket>, market: BorrowingMarketState) => {
  if (
    !markets[BTC_MINT]?.midPrice ||
    !markets[ETH_MINT]?.midPrice ||
    !markets[FTT_MINT]?.midPrice ||
    !markets[SOL_MINT]?.midPrice ||
    !markets[RAY_MINT]?.midPrice ||
    !markets[SRM_MINT]?.midPrice ||
    !markets[MSOL_MINT]?.midPrice
  ) {
    logger.error('error getting all prices from Serum', markets);
    throw Error('Could not get all prices from Serum');
  }
  let collateralTotals: CollateralTotals[] = [];
  let total = new Decimal(0);
  let inactive = new Decimal(0);
  let deposited = new Decimal(0);
  for (const token of SUPPORTED_TOKENS) {
    const coll = getTokenCollateral(token, market.depositedCollateral, market.inactiveCollateral, markets);
    collateralTotals.push(coll);
    total = total.add(coll.deposited.add(coll.inactive).mul(coll.price));
    inactive = inactive.add(coll.inactive.mul(coll.price));
    deposited = deposited.add(coll.deposited.mul(coll.price));
  }
  return { tokens: collateralTotals, total: total, inactive: inactive, deposited: deposited };
};

export const calculateCollateralRatio = (borrowedStablecoin: Decimal, depositedCollateral: Decimal) => {
  if (borrowedStablecoin.isZero()) {
    throw Error("Can't calculate collateral ratio if borrowed stablecoin is 0");
  }

  return depositedCollateral.dividedBy(borrowedStablecoin);
};

export const calculateStabilityProvided = (
  stabilityPoolState: StabilityPoolState,
  stabilityProviderState: StabilityProviderState
) => {
  if (stabilityProviderState.depositedStablecoin.isZero() || !stabilityProviderState.userDepositSnapshot.enabled) {
    return new Decimal(0);
  }
  if (stabilityProviderState.userDepositSnapshot.epoch < stabilityPoolState.currentEpoch) {
    return new Decimal(0);
  }
  const scaleDiff = stabilityPoolState.currentScale.minus(stabilityProviderState.userDepositSnapshot.scale);
  if (scaleDiff.isZero()) {
    return stabilityProviderState.depositedStablecoin
      .mul(stabilityPoolState.p)
      .dividedBy(stabilityProviderState.userDepositSnapshot.product);
  }
  return stabilityProviderState.depositedStablecoin
    .mul(stabilityPoolState.p)
    .dividedBy(stabilityProviderState.userDepositSnapshot.product)
    .dividedBy(SCALE_FACTOR);
};

/*
  Get maximum, minimum and average value in array of numbers
 */
export const maxMinAvg = (arr: number[]) => {
  let max = arr[0];
  let min = arr[0];
  let sum = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i];
    }
    if (arr[i] < min) {
      min = arr[i];
    }
    sum = sum + arr[i];
  }
  return { max, min, avg: arr.length > 0 ? sum / arr.length : 0 };
};
