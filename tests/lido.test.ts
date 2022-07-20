import { disconnect, getLidoEligibleLoans, testDbConnection } from '../src/services/database';
import Decimal from 'decimal.js';

describe('Lido rewards calculation tests', () => {
  beforeAll(async () => {
    await testDbConnection();
  });

  afterAll(async () => {
    // disconnect from DB to cleanup connections
    await disconnect();
  });

  it('should get an eligible loan with single STSOL collateral and >= 40% LTV', async () => {
    const expectedToBeEligible = 'eligibleOneCollateral';
    const actualLoan = (
      await getLidoEligibleLoans(
        'devnet',
        new Date('2020-01-15 00:00:00.000+00'),
        new Date('2020-01-18 00:00:00.000+00')
      )
    ).find((x) => x.userMetadataPubkey === expectedToBeEligible);
    expect(actualLoan?.userMetadataPubkey).toBe(expectedToBeEligible);
    expect(actualLoan?.daysEligible.toNumber()).toBe(3);
    // since LDO rewards are distributed proportionally to USDH minted and this loan has 100 USDH while the other one has 70 USDH
    // we have to do this calculation: 100 USDH / 170 USDH (sum) -> ~0.59 which means
    // it should get ~0.59 * 450 of LDO rewards (in 3 days 150 * 3 LDO is distributed)
    expect(actualLoan?.ldoRewardsEarned.toNumber()).toBeCloseTo(new Decimal(450).mul(0.588235294).toNumber());
  });

  it('should verify a STSOL loan with <40% LTV is eligible', async () => {
    const expectedToBeEligible = 'eligibleOneCollateralLowLTV';
    const actualLoan = (
      await getLidoEligibleLoans(
        'devnet',
        new Date('2020-01-15 00:00:00.000+00'),
        new Date('2020-01-18 00:00:00.000+00')
      )
    ).find((x) => x.userMetadataPubkey === expectedToBeEligible);
    expect(actualLoan?.userMetadataPubkey).toBe(expectedToBeEligible);
    expect(actualLoan?.daysEligible.toNumber()).toBe(3);
    // since LDO rewards are distributed proportionally to USDH minted and this loan has 100 USDH while the other one has 70 USDH
    // we have to do this calculation: 70 USDH / 170 USDH (sum) -> ~0.41 which means
    // it should get ~0.41 * 450 of LDO rewards (in 3 days 150 * 3 LDO is distributed)
    expect(actualLoan?.ldoRewardsEarned.toNumber()).toBeCloseTo(new Decimal(450).mul(0.411764706).toNumber());
  });

  it('should verify a multi-collateral loan is eligible', async () => {
    const expectedToBeEligible = 'eligibleMultiCollateral';
    const actualLoan = (
      await getLidoEligibleLoans(
        'devnet',
        new Date('2019-01-15 00:00:00.000+00'),
        new Date('2019-01-17 00:00:00.000+00')
      )
    ).find((x) => x.userMetadataPubkey === expectedToBeEligible);
    expect(actualLoan?.userMetadataPubkey).toBe(expectedToBeEligible);
    expect(actualLoan?.daysEligible.toNumber()).toBe(2);
    expect(actualLoan?.ldoRewardsEarned.toNumber()).toBe(300);
  });

  it('should verify a multi-collateral loan is not eligible', async () => {
    const notEligible = 'nonEligibleMultiCollateral';
    const actualLoan = (
      await getLidoEligibleLoans(
        'devnet',
        new Date('2018-01-15 00:00:00.000+00'),
        new Date('2018-01-17 00:00:00.000+00')
      )
    ).find((x) => x.userMetadataPubkey === notEligible);
    expect(actualLoan).toBeUndefined();
  });
});
