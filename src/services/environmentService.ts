import { getEnvOrDefault, getEnvOrThrow } from '../utils/envUtils';

export const getAwsEnvironmentVariables = () => {
  const AWS_ACCESS_KEY_ID = getEnvOrThrow('AWS_ACCESS_KEY_ID');
  const AWS_SECRET_ACCESS_KEY = getEnvOrThrow('AWS_SECRET_ACCESS_KEY');
  const COIN_STATS_TABLE = getEnvOrThrow('COIN_STATS_TABLE');
  const AWS_REGION = getEnvOrDefault('AWS_REGION', 'eu-west-1') as string;
  return { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, COIN_STATS_TABLE };
};
