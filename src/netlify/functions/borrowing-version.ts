import { Handler } from '@netlify/functions';
import { parseFromQueryParams, ok } from '../../utils/apiUtils';
import { BorrowingClient } from '../../services/hubble/BorrowingClient';

/**
 * Get current borrowing market state version
 */
export const handler: Handler = async (event, context) => {
  const [web3Client, env, error] = parseFromQueryParams(event);
  if (web3Client && env) {
    const client = new BorrowingClient(web3Client.connection, env);
    const market = await client.getBorrowingMarketState();
    return ok({ version: market.version });
  }
  return error;
};
