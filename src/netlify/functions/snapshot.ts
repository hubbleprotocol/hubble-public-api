import { schedule, Handler } from '@netlify/functions';
import { customError, internalError, ok } from '../../utils/apiUtils';
import { Credentials, DynamoDB } from 'aws-sdk';
import axios from 'axios';
import { MetricsResponse } from '../../models/api/MetricsResponse';
import { getEnvOrDefault, getEnvOrThrow } from '../../utils/envUtils';
import { ENV } from '../../services/web3/client';

const getEnvironmentVariables = () => {
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

const env = getEnvironmentVariables();

const client = axios.create({ baseURL: env.API_URL });
const dynamoDb = new DynamoDB.DocumentClient({
  credentials: new Credentials(env.MY_AWS_ACCESS_KEY_ID, env.MY_AWS_SECRET_ACCESS_KEY),
  endpoint: env.DYNAMODB_ENDPOINT,
});

// Netlify function that runs on schedule (cron) and saves a snapshot of the metrics to AWS
const handler: Handler = async (event, context) => {
  return client
    .get<MetricsResponse>('metrics', { params: { env: env.API_ENVIRONMENT } })
    .then(async (response) => {
      await dynamoDb
        .put({
          TableName: 'metrics',
          Item: {
            environment: env.API_ENVIRONMENT,
            createdOn: new Date().getUTCDate().valueOf(),
            metrics: response.data,
          },
        })
        .promise();
      return ok({
        status: `Successfully saved ${env.API_ENVIRONMENT} snapshot of metrics to AWS (from ${env.API_URL})`,
      });
    })
    .catch((error) => {
      console.error(error);
      // check if AWS error occurred
      if ('statusCode' in error) {
        return customError(error, error.statusCode);
      } else {
        return internalError(error);
      }
    });
};

module.exports.handler = schedule('@hourly', handler);
