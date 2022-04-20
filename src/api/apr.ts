import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { internalError, parseFromQueryParams, unprocessable } from '../utils/apiUtils';
import { Hubble } from '@hubbleprotocol/hubble-sdk';
import { AprResponse } from '../models/api/AprResponse';
import { getHistory } from './history';
import logger from '../services/logger';
import { HBB_DECIMALS } from '../constants/math';
import { OrcaPriceService } from '../services/price/OrcaPriceService';
import Decimal from 'decimal.js';

/**
 * Get APR (annual percentage rate) of HBB and USDH
 */
const aprRoute = Router();
aprRoute.get('/', async (request: Request<never, AprResponse | string, never, EnvironmentQueryParams>, response) => {
  const [web3Client, env, error] = parseFromQueryParams(request.query);
  if (web3Client && env) {
    const hubbleSdk = new Hubble(env, web3Client.connection);

    const hbbStaked = (await hubbleSdk.getStakingPoolState()).totalStake.dividedBy(HBB_DECIMALS);
    const orcaService = new OrcaPriceService();
    const hbbPrice = (await orcaService.getHbbPrice()).getRate();

    const from = new Date();
    from.setDate(from.getDate() - 7);
    from.setMinutes(0);
    from.setSeconds(0);

    const to = new Date(from);
    to.setMinutes(5);

    const history = await getHistory(env, from.valueOf(), to.valueOf());
    if (history.metrics.length === 0) {
      logger.error(history.body);
      response.status(internalError).send('Could not get historical treasury vault data');
      return;
    }
    const treasuryWeekAgo = history.metrics[0].metrics.borrowing.treasury;
    const treasuryNow = await hubbleSdk.getTreasuryVault();
    const hbbApr = calculateHbbApr(treasuryNow, treasuryWeekAgo, hbbStaked, hbbPrice);
    response.send({ hbbApr });
  } else {
    response.status(unprocessable).send(error);
  }
});

/**
 * Calculate HBB APR. How we calculate HBB APR:
 * treasury vault represents 15% of our total borrowing fees, so we take calculate the sum of borrowing fees in the last 7 days:
 * sum_borrowing_fees = (treasury_vault - treasury_vault_7d_ago) * 85/15
 * calculate final APR:
 * HBB APR = (sum_borrowing_fees / 7 * 365) / (hbb_staked * hbb_price)`
 */
function calculateHbbApr(
  treasuryVaultNow: Decimal,
  treasuryVaultOneWeekAgo: Decimal,
  totalHbbStaked: Decimal,
  hbbPrice: Decimal
) {
  logger.info('treasury vault now %d', treasuryVaultNow);
  logger.info('treasury vault 7d ago %d', treasuryVaultOneWeekAgo);
  const sumBorrowingFees = treasuryVaultNow.minus(treasuryVaultOneWeekAgo).mul(85).dividedBy(15);
  logger.info('sum borrowing fees %d', sumBorrowingFees);
  logger.info('borr fees divided by 7*365: %d', sumBorrowingFees.dividedBy(7).mul(365));
  logger.info('total hbb staked %d', totalHbbStaked);
  logger.info('hbb price %d', hbbPrice);
  logger.info('hbb price * staked %d', totalHbbStaked.mul(hbbPrice));

  const apr = sumBorrowingFees.dividedBy(7).mul(365).dividedBy(totalHbbStaked.mul(hbbPrice));
  return apr;
}

export default aprRoute;
