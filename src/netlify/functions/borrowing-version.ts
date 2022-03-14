import { Handler } from '@netlify/functions';
import { badGateway, internalError, ok } from '../../utils/apiUtils';
import { ENV } from '../../services/web3/client';
import { getParameter } from '../../utils/awsUtils';
import { getBorrowingVersionParameterName } from '../../constants/hubble';
import { getSnapshotEnvVariables } from '../../services/environmentService';

const environmentVars = getSnapshotEnvVariables();

/**
 * Get current borrowing market state version
 */
export const handler: Handler = async (event, context) => {
  let env: ENV = 'mainnet-beta';
  if (event?.queryStringParameters?.env) {
    env = event.queryStringParameters.env as ENV;
  }
  const parameterName = getBorrowingVersionParameterName(env);
  const parameter = await getParameter(
    parameterName,
    environmentVars.MY_AWS_ACCESS_KEY_ID,
    environmentVars.MY_AWS_SECRET_ACCESS_KEY,
    environmentVars.MY_AWS_REGION
  );
  const parameterValue = parameter.Parameter?.Value;
  if (parameterValue) {
    const maintenanceModeNumber = parseInt(parameterValue);
    if (isNaN(maintenanceModeNumber)) {
      const err = `Could not parse maintenance mode value from AWS (has to be number): ${maintenanceParameterValue}`;
      console.error(err);
      return internalError(err);
    }
    return ok({ version: maintenanceModeNumber });
  } else {
    const err = 'Could not get maintenance mode value from AWS';
    console.error(err);
    return badGateway(err);
  }
};
