export interface CollateralToken {
  name: string;
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
  // { id: 7, name: 'DAOSOL' },
  // { id: 8, name: 'STSOL' },
  // { id: 100, name: 'OTHER' },
];
