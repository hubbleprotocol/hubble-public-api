import { lamportsToCollateral, scopeTokenToCollateralToken } from './tokenUtils';
import { SCALE_FACTOR } from '../constants/math';
import Decimal from 'decimal.js';
import {
  BorrowingMarketState,
  CollateralAmounts,
  StabilityPoolState,
  StabilityProviderState,
} from '@hubbleprotocol/hubble-sdk';
import TokenCollateral from '../models/api/TokenCollateral';
import { ScopeToken, SupportedToken } from '@hubbleprotocol/scope-sdk';
import { CollateralTokens } from '../constants/tokens';

export const getTotalTokenCollateral = (token: ScopeToken, market: BorrowingMarketState) => {
  const deposited = lamportsToCollateral(
    market.depositedCollateral.amounts[scopeTokenToCollateralToken(token).id],
    token
  );
  const inactive = lamportsToCollateral(
    market.inactiveCollateral.amounts[scopeTokenToCollateralToken(token).id],
    token
  );
  return {
    deposited,
    inactive,
    price: token.price,
    token,
  };
};

export const getTokenCollateral = (
  token: SupportedToken,
  deposited: CollateralAmounts,
  inactive: CollateralAmounts,
  prices: ScopeToken[]
): TokenCollateral => {
  const scopeToken = prices.find((x) => x.name === token);
  if (!scopeToken) {
    throw Error(`Could not get price for ${token} from scope oracle`);
  }
  switch (token) {
    case 'SOL':
      return {
        deposited: lamportsToCollateral(deposited.sol, scopeToken),
        inactive: lamportsToCollateral(inactive.sol, scopeToken),
        price: scopeToken.price,
        token: scopeToken.name,
      };
    case 'ETH':
      return {
        deposited: lamportsToCollateral(deposited.eth, scopeToken),
        inactive: lamportsToCollateral(inactive.eth, scopeToken),
        price: scopeToken.price,
        token: scopeToken.name,
      };
    case 'BTC':
      return {
        deposited: lamportsToCollateral(deposited.btc, scopeToken),
        inactive: lamportsToCollateral(inactive.btc, scopeToken),
        price: scopeToken.price,
        token: scopeToken.name,
      };
    case 'SRM':
      return {
        deposited: lamportsToCollateral(deposited.srm, scopeToken),
        inactive: lamportsToCollateral(inactive.srm, scopeToken),
        price: scopeToken.price,
        token: scopeToken.name,
      };
    case 'RAY':
      return {
        deposited: lamportsToCollateral(deposited.ray, scopeToken),
        inactive: lamportsToCollateral(inactive.ray, scopeToken),
        price: scopeToken.price,
        token: scopeToken.name,
      };
    case 'FTT':
      return {
        deposited: lamportsToCollateral(deposited.ftt, scopeToken),
        inactive: lamportsToCollateral(inactive.ftt, scopeToken),
        price: scopeToken.price,
        token: scopeToken.name,
      };
    case 'MSOL':
      return {
        deposited: lamportsToCollateral(deposited.msol, scopeToken),
        inactive: lamportsToCollateral(inactive.msol, scopeToken),
        price: scopeToken.price,
        token: scopeToken.name,
      };
    default: {
      const collToken = scopeTokenToCollateralToken(scopeToken);
      const depositedColl = deposited.extraCollaterals.find(
        (x) => !x.amount.isZero() && x.tokenId.toNumber() === collToken.id
      );
      const inactiveColl = inactive.extraCollaterals.find(
        (x) => !x.amount.isZero() && x.tokenId.toNumber() === collToken.id
      );
      return {
        deposited: depositedColl ? lamportsToCollateral(depositedColl.amount, scopeToken) : new Decimal(0),
        inactive: inactiveColl ? lamportsToCollateral(inactiveColl.amount, scopeToken) : new Decimal(0),
        price: scopeToken.price,
        token: scopeToken.name,
      };
    }
  }
};

export const getTotalCollateral = async (prices: ScopeToken[], market: BorrowingMarketState) => {
  let collateralTotals = [];
  let total = new Decimal(0);
  let inactive = new Decimal(0);
  let deposited = new Decimal(0);
  for (const token of CollateralTokens) {
    const scopeToken = prices.find((x) => x.name === token.name);
    if (!scopeToken) {
      throw Error(`Could not get price for ${token} from scope oracle`);
    }
    const coll = getTotalTokenCollateral(scopeToken, market);
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

// we expire the historical cache on the first minute of the next hour, we only keep hourly snapshots of history and refresh once per hour
// for example, we save to cache at 10:15, hourly snapshot is saved at 11:00, we need to refresh the cache at 11:01
export const getNextSnapshotDate = () => {
  const expireAt = new Date();
  expireAt.setHours(expireAt.getHours() + 1);
  expireAt.setMinutes(1);
  expireAt.setSeconds(0);
  return expireAt;
};
