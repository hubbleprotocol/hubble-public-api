import { schedule, Handler } from '@netlify/functions';
import { customError, internalError, ok } from '../../utils/apiUtils';
import { Credentials, DynamoDB } from 'aws-sdk';
import axios from 'axios';
import { MetricsResponse } from '../../models/api/MetricsResponse';
import { getSnapshotEnvVariables } from '../../services/environmentService';

const env = getSnapshotEnvVariables();

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
            createdOn: new Date().valueOf(),
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
