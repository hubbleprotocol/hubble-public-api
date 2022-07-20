import { disconnect, getLidoEligibleLoans, testDbConnection } from '../src/services/database';

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
    ).find((x) => x.user_metadata_pubkey === expectedToBeEligible);
    expect(actualLoan?.user_metadata_pubkey).toBe(expectedToBeEligible);
  });

  it('should verify a STSOL loan with <40% LTV is eligible', async () => {
    const expectedToBeEligible = 'eligibleOneCollateralLowLTV';
    const actualLoan = (
      await getLidoEligibleLoans(
        'devnet',
        new Date('2020-01-15 00:00:00.000+00'),
        new Date('2020-01-18 00:00:00.000+00')
      )
    ).find((x) => x.user_metadata_pubkey === expectedToBeEligible);
    expect(actualLoan?.user_metadata_pubkey).toBe(expectedToBeEligible);
  });

  it('should verify a multi-collateral loan is eligible', async () => {
    const expectedToBeEligible = 'eligibleMultiCollateral';
    const actualLoan = (
      await getLidoEligibleLoans(
        'devnet',
        new Date('2019-01-15 00:00:00.000+00'),
        new Date('2019-01-17 00:00:00.000+00')
      )
    ).find((x) => x.user_metadata_pubkey === expectedToBeEligible);
    expect(actualLoan?.user_metadata_pubkey).toBe(expectedToBeEligible);
  });

  it('should verify a multi-collateral loan is not eligible', async () => {
    const notEligible = 'nonEligibleMultiCollateral';
    const actualLoan = (
      await getLidoEligibleLoans(
        'devnet',
        new Date('2018-01-15 00:00:00.000+00'),
        new Date('2018-01-17 00:00:00.000+00')
      )
    ).find((x) => x.user_metadata_pubkey === notEligible);
    expect(actualLoan).toBeUndefined();
  });
});
