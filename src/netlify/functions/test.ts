import { Handler } from '@netlify/functions';
import { getConfigByEnv, HUBBLE_CONFIGS } from '../../services/hubble/hubbleConfig';
import { internalError, ok } from '../../utils/apiUtils';
import { ENV } from '../../services/web3/client';

export const handler: Handler = (event, context) => {
  console.log('hello world?');
  return ok({ test: 'test1234' });

  // let env: ENV | undefined;
  // if (event?.queryStringParameters?.env) {
  //   env = event.queryStringParameters.env as ENV;
  // }
  // try {
  //   if (env) {
  //     return ok(getConfigByEnv(env));
  //   }
  //
  //   return ok(HUBBLE_CONFIGS);
  // } catch (e) {
  //   console.error(e);
  //   return internalError(e);
  // }
};
