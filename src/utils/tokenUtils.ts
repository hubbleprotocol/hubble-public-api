import { SupportedToken } from '../constants/tokens';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  DECIMALS_BTC,
  DECIMALS_ETH,
  DECIMALS_FTT,
  DECIMALS_RAY,
  DECIMALS_SRM,
  LAMPORTS_PER_MSOL,
} from '../constants/math';

export const lamportsToCollateral = (lamports: number, token: SupportedToken): number => {
  let factor = LAMPORTS_PER_SOL;
  switch (token) {
    case 'SOL': {
      factor = LAMPORTS_PER_SOL;
      break;
    }
    case 'mSOL': {
      factor = LAMPORTS_PER_MSOL;
      break;
    }
    case 'ETH': {
      factor = DECIMALS_ETH;
      break;
    }
    case 'BTC': {
      factor = DECIMALS_BTC;
      break;
    }
    case 'SRM': {
      factor = DECIMALS_SRM;
      break;
    }
    case 'RAY': {
      factor = DECIMALS_RAY;
      break;
    }
    case 'FTT': {
      factor = DECIMALS_FTT;
      break;
    }
  }

  if (lamports === 0) {
    return 0;
  }
  return lamports / factor;
};
