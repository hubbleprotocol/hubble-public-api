import { Handler } from '@netlify/functions';
import { ok } from '../../utils/apiUtils';
import { ENV } from '../../services/web3/client';
import { getAllConfigs, getConfigByCluster } from '@hubbleprotocol/hubble-config';

export const handler: Handler = async (event, context) => {
  let env: ENV | undefined;
  if (event?.queryStringParameters?.env) {
    env = event.queryStringParameters.env as ENV;
  }
  if (env) {
    return ok(getConfigByCluster(env));
  }

  return ok(getAllConfigs());
};
