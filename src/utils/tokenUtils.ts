import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
  DECIMALS_BTC,
  DECIMALS_ETH,
  DECIMALS_FTT,
  DECIMALS_RAY,
  DECIMALS_SRM,
  LAMPORTS_PER_WSTETH,
  LAMPORTS_PER_MSOL,
  LAMPORTS_PER_STSOL,
} from '../constants/math';
import Decimal from 'decimal.js';
import { ScopeToken } from '@hubbleprotocol/scope-sdk';

export const lamportsToCollateral = (lamports: Decimal, token: ScopeToken): Decimal => {
  let factor = LAMPORTS_PER_SOL;
  switch (token.name) {
    case 'SOL':
      factor = LAMPORTS_PER_SOL;
      break;
    case 'ETH':
      factor = DECIMALS_ETH;
      break;
    case 'BTC':
      factor = DECIMALS_BTC;
      break;
    case 'SRM':
      factor = DECIMALS_SRM;
      break;
    case 'RAY':
      factor = DECIMALS_RAY;
      break;
    case 'FTT':
      factor = DECIMALS_FTT;
      break;
    case 'MSOL':
      factor = LAMPORTS_PER_MSOL;
      break;
    case 'wstETH':
      factor = LAMPORTS_PER_WSTETH;
      break;
    case 'STSOL':
      factor = LAMPORTS_PER_STSOL;
      break;
    default:
      throw Error(`${token.name} not supported yet`);
  }

  if (lamports.isZero()) {
    return lamports;
  }
  return lamports.dividedBy(factor);
};

export const tryGetPublicKeyFromString = (pubkey: string): PublicKey | undefined => {
  try {
    return new PublicKey(pubkey);
  } catch {
    return undefined;
  }
};
