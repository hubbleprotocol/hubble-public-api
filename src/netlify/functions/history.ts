import { Handler } from '@netlify/functions';
import { internalError, ok } from '../../utils/apiUtils';
import { TimestampValueResponse } from '../../models/api/TimestampValueResponse';
import { ENV } from '../../services/web3/client';
import { getSnapshotEnvVariables } from '../../services/environmentService';
import { Credentials, DynamoDB } from 'aws-sdk';
import { MetricsSnapshot } from '../../models/api/MetricsSnapshot';
import { HistoryResponse } from '../../models/api/HistoryResponse';

const environmentVars = getSnapshotEnvVariables();
const dynamoDb = new DynamoDB.DocumentClient({
  credentials: new Credentials(environmentVars.MY_AWS_ACCESS_KEY_ID, environmentVars.MY_AWS_SECRET_ACCESS_KEY),
  endpoint: environmentVars.DYNAMODB_ENDPOINT,
});

const getHistory = async (env: ENV, fromEpoch: number, toEpoch: number) => {
  try {
    const history = await dynamoDb
      .query({
        TableName: 'metrics',
        KeyConditionExpression: '#env = :envValue',
        ExpressionAttributeNames: { '#env': 'environment' }, //environment is a reserved word so we replace it with #env
        ExpressionAttributeValues: { ':envValue': env },
      })
      .promise();
    const response: HistoryResponse = {
      borrowersHistory: [],
      hbbHoldersHistory: [],
      hbbPriceHistory: [],
      loansHistory: [],
      usdhHistory: [],
    };
    if (history?.Count) {
      for (const key of history.Items!) {
        const snapshot = key as MetricsSnapshot;
        response.borrowersHistory.push({
          epoch: snapshot.createdOn,
          value: snapshot.metrics.borrowing.numberOfBorrowers,
        });
        response.loansHistory.push({
          epoch: snapshot.createdOn,
          value: snapshot.metrics.borrowing.loans.total,
        });
        response.usdhHistory.push({
          epoch: snapshot.createdOn,
          value: snapshot.metrics.usdh.issued,
        });
        response.hbbPriceHistory.push({
          epoch: snapshot.createdOn,
          value: snapshot.metrics.hbb.price,
        });
        response.hbbHoldersHistory.push({
          epoch: snapshot.createdOn,
          value: snapshot.metrics.hbb.numberOfHolders,
        });
      }
    } else {
      const err = `could not get history from AWS ${history}`;
      console.error(err);
      return internalError(err);
    }
    return ok(response);
  } catch (e) {
    console.error(e);
    if (e instanceof Error) {
      return internalError(e.message);
    } else {
      return internalError(`Internal Server Error: ${e}`);
    }
  }
};

// GET /history of Hubble stats
export const handler: Handler = async (event, context) => {
  let env: ENV = 'mainnet-beta';
  let fromEpoch: number = new Date().valueOf();
  let toEpoch: number = new Date().valueOf();
  if (event?.queryStringParameters?.env) {
    env = event.queryStringParameters.env as ENV;
  }
  if (event?.queryStringParameters?.from) {
    fromEpoch = +event.queryStringParameters.from;
  }
  if (event?.queryStringParameters?.to) {
    toEpoch = +event.queryStringParameters.to;
  }
  return await getHistory(env, fromEpoch, toEpoch);
};
