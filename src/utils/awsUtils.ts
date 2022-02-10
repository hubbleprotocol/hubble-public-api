import { Credentials, DynamoDB } from 'aws-sdk';

export const getDynamoDb = (
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  endpoint: string | undefined = undefined
) => {
  return new DynamoDB.DocumentClient({
    credentials: new Credentials(accessKeyId, secretAccessKey),
    endpoint: endpoint,
    region: region,
  });
};
