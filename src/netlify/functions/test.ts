import { Handler } from '@netlify/functions';

export const handler: Handler = (event, context) => {
  console.log('hello world?');
  return {
    statusCode: 200,
    body: JSON.stringify({ test: 'hi' }),
  };

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
