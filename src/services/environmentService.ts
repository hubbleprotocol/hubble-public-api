import { getEnvOrDefault, getEnvOrThrow } from '../utils/envUtils';
import { ENV } from './web3/client';

export const getSnapshotEnvVariables = () => {
  // base API URL
  const API_URL = getEnvOrThrow('API_URL');
  // solana environment (cluster)
  const API_ENVIRONMENT = getEnvOrThrow('API_ENVIRONMENT') as ENV;
  // if testing on your machine, you can spin up a local dynamodb instance and use that instead of actual AWS webservice
  const DYNAMODB_ENDPOINT = getEnvOrDefault('DYNAMODB_ENDPOINT', undefined);

  // AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are reserved by netlify, so we use MY_* prefix
  // AWS keys are not needed if using dynamodb locally
  const MY_AWS_ACCESS_KEY_ID = DYNAMODB_ENDPOINT
    ? (getEnvOrDefault('MY_AWS_ACCESS_KEY_ID', 'placeholder') as string)
    : getEnvOrThrow('MY_AWS_ACCESS_KEY_ID');
  const MY_AWS_SECRET_ACCESS_KEY = DYNAMODB_ENDPOINT
    ? (getEnvOrDefault('MY_AWS_SECRET_ACCESS_KEY', 'placeholder') as string)
    : getEnvOrThrow('MY_AWS_SECRET_ACCESS_KEY');
  return { API_URL, API_ENVIRONMENT, MY_AWS_ACCESS_KEY_ID, MY_AWS_SECRET_ACCESS_KEY, DYNAMODB_ENDPOINT };
};
