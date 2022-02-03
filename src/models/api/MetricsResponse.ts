import { TimestampValueResponse } from './TimestampValueResponse';
import { CollateralResponse } from './CollateralResponse';
import { BorrowingResponse } from './BorrowingResponse';
import { UsdhResponse } from './UsdhResponse';
import { HbbResponse } from './HbbResponse';
import { PercentileResponse } from './PercentileResponse';

// Response returned from the /metrics endpoint
export type MetricsResponse = {
  // Revenue generated (total distributed rewards + rewards not yet claimed)
  revenue: number;

  // Collateral stats
  collateral: CollateralResponse;

  // Borrowing market stats
  borrowing: BorrowingResponse;

  // Stablecoin (USDH) stats
  usdh: UsdhResponse;

  // HBB stats
  hbb: HbbResponse;

  // Circulating supply value - total issued HBB * HBB price
  circulatingSupplyValue: number;

  // Total Value Locked (TVL) => total staked HBB + total collateral + total USDH
  totalValueLocked: number;
};

export const getMockResponse = (): MetricsResponse => {
  return {
    borrowing: {
      borrowersHistory: getMockHistory(new Date('2021-01-01'), new Date('2021-01-02')),
      loans: {
        total: 1_000_000.123,
        history: getMockHistory(new Date('2021-01-01'), new Date('2021-01-02')),
        max: 200_000.2,
        min: 100.5,
        average: 5000.5,
        distribution: getMockDistribution(),
        median: 4700.75,
      },
      treasury: 1_200_132.47,
      numberOfBorrowers: 4123,
    },
    collateral: {
      deposited: 250_000.25,
      depositedTokens: [
        { name: 'ETH', amount: 123.4567891123, price: 3124.25 },
        { name: 'FTT', amount: 84848.55, price: 120.25 },
        { name: 'mSOL', amount: 123435, price: 150 },
        { name: 'SOL', amount: 123435, price: 150 },
        { name: 'RAY', amount: 123.4567891123, price: 15.5 },
        { name: 'SRM', amount: 123.4567891123, price: 15.5 },
        { name: 'BTC', amount: 123.4567891123, price: 15.5 },
      ],
      inactive: 375_125.15,
      total: 555_000_000.34,
      collateralRatio: 1.8,
      ratioDistribution: getMockDistribution(),
    },
    hbb: {
      holdersHistory: getMockHistory(new Date('2021-01-01'), new Date('2021-01-02')),
      issued: 800_000_000,
      priceHistory: getMockHistory(new Date('2021-01-01'), new Date('2021-01-02')),
      staked: 1_300_000,
      price: 1.0,
      numberOfStakers: 1500,
      numberOfHolders: 500,
    },
    revenue: 123_456.789,
    usdh: {
      issued: 800_000_000,
      history: getMockHistory(new Date('2021-01-01'), new Date('2021-01-02')),
      jupiter: {
        price: 1.0001,
        liquidityPool: 5_500_000.23,
      },
      saber: {
        price: 0.9991,
        liquidityPool: 4_500_000.23,
      },
      stabilityPool: 181_000_100,
      stabilityPoolDistribution: getMockDistribution(),
    },
    circulatingSupplyValue: 5000,
    totalValueLocked: 6000000,
  };
};

const getMockHistory = (start: Date, end: Date): TimestampValueResponse[] => {
  const history: TimestampValueResponse[] = [];
  for (const dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    history.push({ epoch: dt.valueOf(), value: Math.random() * 1000 });
  }
  return history;
};

const getMockDistribution = (): PercentileResponse[] => {
  const distribution: PercentileResponse[] = [];
  for (let i = 1; i <= 100; i++) {
    distribution.push({ value: Math.random() * 1000, totalCount: i, percentile: i / 100 });
  }
  return distribution;
};
