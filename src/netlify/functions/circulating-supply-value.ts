import { Handler } from '@netlify/functions';
import { parseFromQueryParams, ok } from '../../utils/apiUtils';
import { BorrowingClient } from '../../services/hubble/BorrowingClient';
import { OrcaPriceService } from '../../services/price/OrcaPriceService';

/**
 * Get circulating supply value of HBB (HBB issued * HBB price). This endpoint is required for external services like CoinMarketCap.
 */
export const handler: Handler = async (event, context) => {
  const [web3Client, env, error] = parseFromQueryParams(event);
  if (web3Client && env) {
    const client = new BorrowingClient(web3Client.connection, env);
    const orcaService = new OrcaPriceService();
    const hbbMint = await client.getHbbMintAccount();
    const hbbPrice = (await orcaService.getHbbPrice()).getRate().toNumber();
    const circulatingSupplyValue = (hbbMint.uiAmount as number) * hbbPrice;
    return ok(circulatingSupplyValue.toString(), false);
  }
  return error;
};
