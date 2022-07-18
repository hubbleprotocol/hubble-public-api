import { disconnect, getLidoEligibleLoans, testDbConnection } from '../src/services/database';

describe('Lido rewards calculation tests', () => {
  beforeAll(async () => {
    await testDbConnection();
  });

  afterAll(async () => {
    // disconnect from DB to cleanup connections
    await disconnect();
  });

  it('should get an eligible loan', async () => {
    const expectedToBeEligible = 'eligibleOneCollateral8kzX1xg6PFN2ZYExxRyZUaF';
    const actualLoan = (
      await getLidoEligibleLoans(
        'devnet',
        new Date('2020-01-15 00:00:00.000+00'),
        new Date('2020-01-18 00:00:00.000+00')
      )
    ).find((x) => x.user_metadata_pubkey === expectedToBeEligible);
    expect(actualLoan?.user_metadata_pubkey).toBe(expectedToBeEligible);
  });

  it('should verify a non eligible loan is not included', async () => {
    const notExpectedToBeEligible = 'notEligibleOneCollateralX1xg6PFN2ZYExxRyZUaF';
    const actualLoan = (
      await getLidoEligibleLoans(
        'devnet',
        new Date('2020-01-15 00:00:00.000+00'),
        new Date('2020-01-18 00:00:00.000+00')
      )
    ).find((x) => x.user_metadata_pubkey === notExpectedToBeEligible);
    expect(actualLoan).toBeUndefined();
  });
});
