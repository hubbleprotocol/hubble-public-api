import { Credentials, DynamoDB } from 'aws-sdk';

export const getDynamoDb = (accessKeyId: string, secretAccessKey: string, region: string) => {
  return new DynamoDB.DocumentClient({
    credentials: new Credentials(accessKeyId, secretAccessKey),
    region: region,
  });
};
