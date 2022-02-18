import { Handler } from '@netlify/functions';
import { ENV, Web3Client } from '../../services/web3/client';
import { ok, unprocessable } from '../../utils/apiUtils';
import { BorrowingClient } from '../../services/hubble/BorrowingClient';
import { OrcaPriceService } from '../../services/price/OrcaPriceService';

/**
 * Get circulating supply value of HBB (HBB issued * HBB price). This endpoint is required for external services like CoinGecko.
 */
export const handler: Handler = async (event, context) => {
  let env: ENV = 'mainnet-beta';
  if (event?.queryStringParameters?.env) {
    env = event.queryStringParameters.env as ENV;
  }

  let web3Client: Web3Client;
  try {
    web3Client = new Web3Client(env);
  } catch (e) {
    const error = e as Error;
    console.error(error);
    return unprocessable(error.message);
  }

  const client = new BorrowingClient(web3Client.connection, env);
  const orcaService = new OrcaPriceService();
  const hbbMint = await client.getHbbMintAccount();
  const hbbPrice = (await orcaService.getHbbPrice()).getRate().toNumber();
  const circulatingSupplyValue = (hbbMint.uiAmount as number) * hbbPrice;
  return ok(circulatingSupplyValue.toString(), false);
};
