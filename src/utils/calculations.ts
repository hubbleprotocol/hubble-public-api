import { SerumMarket } from '../models/SerumMarket';
import { BorrowingMarketState } from '../models/hubble/BorrowingMarketState';
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
import { CollateralTotals } from '../models/hubble/CollateralTotals';
import CollateralAmounts from '../models/hubble/CollateralAmounts';
import { lamportsToCollateral } from './tokenUtils';
import StabilityPoolState from '../models/hubble/StabilityPoolState';
import { StabilityProviderState } from '../models/hubble/StabilityProviderState';
import { SCALE_FACTOR } from '../constants/math';

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
        price: markets[SOL_MINT].midPrice! * 1000,
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
        price: markets[MSOL_MINT].midPrice! * 1000,
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
    console.error('error getting all prices from Serum', markets);
    throw Error('Could not get all prices from Serum');
  }
  let collateralTotals: CollateralTotals[] = [];
  let total = 0;
  let inactive = 0;
  let deposited = 0;
  for (const token of SUPPORTED_TOKENS) {
    const coll = getTokenCollateral(token, market.depositedCollateral, market.inactiveCollateral, markets);
    collateralTotals.push(coll);
    total += (coll.deposited + coll.inactive) * coll.price;
    inactive += coll.inactive * coll.price;
    deposited += coll.deposited * coll.price;
  }
  return { tokens: collateralTotals, total: total, inactive: inactive, deposited: deposited };
};

export const calculateCollateralRatio = (borrowedStablecoin: number, depositedCollateral: number) => {
  if (borrowedStablecoin === 0) {
    throw Error("Can't calculate collateral ratio if borrowed stablecoin is 0");
  }

  return depositedCollateral / borrowedStablecoin;
};

export const calculateStabilityProvided = (
  stabilityPoolState: StabilityPoolState,
  stabilityProviderState: StabilityProviderState
) => {
  if (stabilityProviderState.depositedStablecoin === 0 || !stabilityProviderState.userDepositSnapshot.enabled) {
    return 0;
  }
  if (stabilityProviderState.userDepositSnapshot.epoch < stabilityPoolState.currentEpoch) {
    return 0;
  }
  const scaleDiff = stabilityPoolState.currentScale - stabilityProviderState.userDepositSnapshot.scale;
  if (scaleDiff === 0) {
    return (
      (stabilityProviderState.depositedStablecoin * stabilityPoolState.p) /
      stabilityProviderState.userDepositSnapshot.product
    );
  }
  return (
    (stabilityProviderState.depositedStablecoin * stabilityPoolState.p) /
    stabilityProviderState.userDepositSnapshot.product /
    SCALE_FACTOR
  );
};
