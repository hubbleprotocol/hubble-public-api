import { SUPPORTED_TOKENS, SupportedToken } from '../constants/tokens';
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
import { PythPrice } from '../services/price/PythPriceService';

export const getTokenCollateral = (
  token: SupportedToken,
  deposited: CollateralAmounts,
  inactive: CollateralAmounts,
  prices: PythPrice[]
): CollateralTotals => {
  switch (token) {
    case 'BTC':
      return {
        deposited: lamportsToCollateral(deposited.btc, token),
        inactive: lamportsToCollateral(inactive.btc, token),
        price: getPythPriceForToken(token, prices),
        token: token,
      };
    case 'SRM':
      return {
        deposited: lamportsToCollateral(deposited.srm, token),
        inactive: lamportsToCollateral(inactive.srm, token),
        price: getPythPriceForToken(token, prices),
        token: token,
      };
    case 'ETH':
      return {
        deposited: lamportsToCollateral(deposited.eth, token),
        inactive: lamportsToCollateral(inactive.eth, token),
        price: getPythPriceForToken(token, prices),
        token: token,
      };
    case 'SOL':
      return {
        deposited: lamportsToCollateral(deposited.sol, token),
        inactive: lamportsToCollateral(inactive.sol, token),
        price: getPythPriceForToken(token, prices),
        token: token,
      };
    case 'FTT':
      return {
        deposited: lamportsToCollateral(deposited.ftt, token),
        inactive: lamportsToCollateral(inactive.ftt, token),
        price: getPythPriceForToken(token, prices),
        token: token,
      };
    case 'RAY':
      return {
        deposited: lamportsToCollateral(deposited.ray, token),
        inactive: lamportsToCollateral(inactive.ray, token),
        price: getPythPriceForToken(token, prices),
        token: token,
      };
    case 'mSOL':
      return {
        deposited: lamportsToCollateral(deposited.msol, token),
        inactive: lamportsToCollateral(inactive.msol, token),
        price: getPythPriceForToken(token, prices),
        token: token,
      };
  }
};

function getPythPriceForToken(token: SupportedToken, prices: PythPrice[]) {
  const price = prices.find((x) => x.token === token);
  if (price?.priceData) {
    if (price.priceData.price) {
      return new Decimal(price.priceData.price);
    } else {
      logger.info({
        message: `Current ${token} Pyth price is not valid, using previous price`,
        previousPrice: price.priceData.previousPrice,
      });
      return new Decimal(price.priceData.previousPrice);
    }
  }
  throw Error(`Could not get price from Pyth for ${token}`);
}

export const getTotalCollateral = async (prices: PythPrice[], market: BorrowingMarketState) => {
  if (prices.find((x) => !x.priceData)) {
    logger.error({ message: 'error getting price from pyth', markets: prices });
    throw Error('Could not get prices from Pyth');
  }
  let collateralTotals: CollateralTotals[] = [];
  let total = new Decimal(0);
  let inactive = new Decimal(0);
  let deposited = new Decimal(0);
  for (const token of SUPPORTED_TOKENS) {
    const coll = getTokenCollateral(token, market.depositedCollateral, market.inactiveCollateral, prices);
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

export const median = (numbers: number[]) => {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
};

export const dateToUnixSeconds = (date: Date) => {
  return Math.round(date.valueOf() / 1000);
};
