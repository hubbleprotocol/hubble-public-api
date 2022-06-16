import { SupportedToken } from '@hubbleprotocol/scope-sdk';

export interface CollateralToken {
  name: SupportedToken;
  /**
   * Hubble smart contracts extra collateral ID
   */
  id: number;
}

export const CollateralTokens: CollateralToken[] = [
  { id: 0, name: 'SOL' },
  { id: 1, name: 'ETH' },
  { id: 2, name: 'BTC' },
  { id: 3, name: 'SRM' },
  { id: 4, name: 'RAY' },
  { id: 5, name: 'FTT' },
  { id: 6, name: 'MSOL' },
  { id: 7, name: 'daoSOL' },
  { id: 8, name: 'STSOL' },
  { id: 9, name: 'scnSOL' },
  { id: 10, name: 'wstETH' },
  { id: 11, name: 'LDO' },
];
