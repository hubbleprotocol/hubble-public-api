import { Handler } from '@netlify/functions';
import { badGateway, badRequest, internalError, ok } from '../../utils/apiUtils';
import { ENV } from '../../services/web3/client';
import { getSnapshotEnvVariables } from '../../services/environmentService';
import { MetricsSnapshot } from '../../models/api/MetricsSnapshot';
import { HistoryResponse } from '../../models/api/HistoryResponse';
import { getDynamoDb } from '../../utils/awsUtils';

const environmentVars = getSnapshotEnvVariables();
const dynamoDb = getDynamoDb(
  environmentVars.MY_AWS_ACCESS_KEY_ID,
  environmentVars.MY_AWS_SECRET_ACCESS_KEY,
  environmentVars.MY_AWS_REGION,
  environmentVars.DYNAMODB_ENDPOINT
);

const getHistory = async (env: ENV, fromEpoch: number, toEpoch: number) => {
  try {
    const history = await dynamoDb
      .query({
        TableName: 'metrics',
        KeyConditionExpression: '#env = :envValue and createdOn between :fromEpoch and :toEpoch',
        ExpressionAttributeNames: { '#env': 'environment' }, //environment is a dynamodb reserved word, so we replace it with #env
        ExpressionAttributeValues: { ':envValue': env, ':fromEpoch': fromEpoch, ':toEpoch': toEpoch },
      })
      .promise();
    const response: HistoryResponse = {
      startDate: fromEpoch,
      endDate: toEpoch,
      borrowersHistory: [],
      hbbHoldersHistory: [],
      hbbPriceHistory: [],
      loansHistory: [],
      usdhHistory: [],
    };
    if (history?.Items) {
      for (const key of history.Items) {
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
      console.error(`could not get history from AWS ${history}`);
      return badGateway('Could not get history data from AWS');
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
  let from = new Date();
  from.setMonth(from.getMonth() - 1); //by default only return historical data for the past month
  let fromEpoch: number = from.valueOf();
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
  if (fromEpoch > toEpoch) {
    return badRequest(`Start date (epoch: ${fromEpoch}) can not be bigger than end date (epoch: ${toEpoch})`);
  }
  return await getHistory(env, fromEpoch, toEpoch);
};
