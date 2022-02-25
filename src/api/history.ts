import { badGateway, badRequest, ok } from '../utils/apiUtils';
import { ENV } from '../services/web3/client';
import { getAwsEnvironmentVariables } from '../services/environmentService';
import { MetricsSnapshot } from '../models/api/MetricsSnapshot';
import { HistoryResponse } from '../models/api/HistoryResponse';
import { getDynamoDb } from '../utils/awsUtils';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import Router from 'express-promise-router';
import { Request } from 'express';

const environmentVars = getAwsEnvironmentVariables();
const dynamoDb = getDynamoDb(
  environmentVars.AWS_ACCESS_KEY_ID,
  environmentVars.AWS_SECRET_ACCESS_KEY,
  environmentVars.AWS_REGION
);

/**
 * Get Hubble on-chain historical metrics
 */
const historyRoute = Router();
type HistoryQueryParams = {
  env: ENV | undefined;
  from: string | undefined;
  to: string | undefined;
};
historyRoute.get('/', async (request: Request<never, string, never, HistoryQueryParams>, response) => {
  let env: ENV = request.query.env ?? 'mainnet-beta';
  let from = new Date();
  from.setMonth(from.getMonth() - 1); //by default only return historical data for the past month
  let fromEpoch: number = request.query.from ? +request.query.from : from.valueOf();
  let toEpoch: number = request.query.to ? +request.query.to : new Date().valueOf();
  if (fromEpoch > toEpoch) {
    response
      .status(badRequest)
      .send(`Start date (epoch: ${fromEpoch}) can not be bigger than end date (epoch: ${toEpoch})`);
  } else {
    const res = await getHistory(env, fromEpoch, toEpoch);
    response.status(res.status).send(res.body);
  }
});

async function getHistory(env: ENV, fromEpoch: number, toEpoch: number): Promise<{ status: number; body: any }> {
  const params: DocumentClient.QueryInput = {
    TableName: environmentVars.COIN_STATS_TABLE,
    KeyConditionExpression: '#env = :envValue and createdOn between :fromEpoch and :toEpoch',
    ExpressionAttributeNames: { '#env': 'environment' }, //environment is a dynamodb reserved word, so we replace it with #env
    ExpressionAttributeValues: { ':envValue': env, ':fromEpoch': fromEpoch, ':toEpoch': toEpoch },
  };

  const response: HistoryResponse = {
    startDate: fromEpoch,
    endDate: toEpoch,
    borrowersHistory: [],
    hbbHoldersHistory: [],
    hbbPriceHistory: [],
    loansHistory: [],
    usdhHistory: [],
  };

  do {
    const queryResults = await dynamoDb.query(params).promise();
    if (queryResults?.Items) {
      for (const key of queryResults.Items) {
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
      return { status: badGateway, body: 'Could not get history data from AWS' };
    }
    params.ExclusiveStartKey = queryResults.LastEvaluatedKey;
  } while (params.ExclusiveStartKey !== undefined);

  return { status: ok, body: response };
}

export default historyRoute;
