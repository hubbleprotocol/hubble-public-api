import { Handler } from '@netlify/functions';
import { getConfigByEnv, HUBBLE_CONFIGS } from '../../services/hubble/hubbleConfig';
import { ok } from '../../utils/apiUtils';
import { ENV } from '../../services/web3/client';

export const handler: Handler = async (event, context) => {
  let env: ENV | undefined;
  if (event?.queryStringParameters?.env) {
    env = event.queryStringParameters.env as ENV;
  }
  if (env) {
    return ok(getConfigByEnv(env));
  }

  return ok(HUBBLE_CONFIGS);
};
