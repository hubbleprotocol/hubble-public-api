import { Handler } from '@netlify/functions';
import { parseFromQueryParams, ok } from '../../utils/apiUtils';
import { BorrowingClient } from '../../services/hubble/BorrowingClient';

/**
 * Get circulating supply of HBB (amount of HBB issued). This endpoint is required for external services like CoinGecko.
 */
export const handler: Handler = async (event, context) => {
  const [web3Client, env, error] = parseFromQueryParams(event);
  if (web3Client && env) {
    const client = new BorrowingClient(web3Client.connection, env);
    const hbbMint = await client.getHbbMintAccount();
    const circulatingSupply = hbbMint.uiAmount as number;
    return ok(circulatingSupply.toString(), false);
  }
  return error;
};