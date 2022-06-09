import { CollateralToken, CollateralTokens } from '../constants/tokens';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
  DECIMALS_BTC,
  DECIMALS_ETH,
  DECIMALS_FTT,
  DECIMALS_RAY,
  DECIMALS_SRM,
  LAMPORTS_PER_DAOSOL,
  LAMPORTS_PER_MSOL,
  LAMPORTS_PER_STSOL,
} from '../constants/math';
import Decimal from 'decimal.js';
import { TokenWithPubkey } from '../services/price/PythPriceService';
import { HubbleConfig } from '@hubbleprotocol/hubble-config';

export const lamportsToCollateral = (lamports: Decimal, token: CollateralToken): Decimal => {
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
    case 'DAOSOL':
      factor = LAMPORTS_PER_DAOSOL;
      break;
    case 'STSOL':
      factor = LAMPORTS_PER_STSOL;
      break;
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

export const getPythTokens = (config: HubbleConfig): TokenWithPubkey[] => {
  return [
    { token: CollateralTokens.find((x) => x.name === 'BTC')!, pubkey: config.borrowing.accounts.pyth?.btcPriceInfo! },
    { token: CollateralTokens.find((x) => x.name === 'mSOL')!, pubkey: config.borrowing.accounts.pyth?.msolPriceInfo! },
    { token: CollateralTokens.find((x) => x.name === 'SRM')!, pubkey: config.borrowing.accounts.pyth?.srmPriceInfo! },
    { token: CollateralTokens.find((x) => x.name === 'RAY')!, pubkey: config.borrowing.accounts.pyth?.rayPriceInfo! },
    { token: CollateralTokens.find((x) => x.name === 'SOL')!, pubkey: config.borrowing.accounts.pyth?.solPriceInfo! },
    { token: CollateralTokens.find((x) => x.name === 'FTT')!, pubkey: config.borrowing.accounts.pyth?.fttPriceInfo! },
    { token: CollateralTokens.find((x) => x.name === 'ETH')!, pubkey: config.borrowing.accounts.pyth?.ethPriceInfo! },
  ];
};
