import { Handler } from '@netlify/functions';
import { badGateway, internalError, ok } from '../../utils/apiUtils';
import { ENV } from '../../services/web3/client';
import { getAllConfigs, getConfigByEnv } from '@hubbleprotocol/hubble-config';
import { getParameter } from '../../utils/awsUtils';
import { getMaintenanceModeParameterName } from '../../constants/hubble';
import { getSnapshotEnvVariables } from '../../services/environmentService';

const environmentVars = getSnapshotEnvVariables();

export const handler: Handler = async (event, context) => {
  let env: ENV = 'mainnet-beta';
  if (event?.queryStringParameters?.env) {
    env = event.queryStringParameters.env as ENV;
  }
  const parameterName = getMaintenanceModeParameterName(env);
  const parameter = await getParameter(
    parameterName,
    environmentVars.MY_AWS_ACCESS_KEY_ID,
    environmentVars.MY_AWS_SECRET_ACCESS_KEY,
    environmentVars.MY_AWS_REGION
  );
  const maintenanceParameterValue = parameter.Parameter?.Value;
  if (maintenanceParameterValue) {
    const maintenanceModeNumber = parseInt(maintenanceParameterValue);
    if (isNaN(maintenanceModeNumber)) {
      const err = `Could not parse maintenance mode value from AWS (has to be number): ${maintenanceParameterValue}`;
      console.error(err);
      return internalError(err);
    }
    return ok({ enabled: maintenanceModeNumber > 0 });
  } else {
    const err = 'Could not get maintenance mode value from AWS';
    console.error(err);
    return badGateway(err);
  }
};
