import { Credentials, DynamoDB, SSM } from 'aws-sdk';

export const getDynamoDb = (accessKeyId: string, secretAccessKey: string, region: string) => {
  return new DynamoDB.DocumentClient({
    credentials: new Credentials(accessKeyId, secretAccessKey),
    region: region,
  });
};

export const getParameter = (parameterName: string, accessKeyId: string, secretAccessKey: string, region: string) => {
  const ssm = new SSM({ credentials: new Credentials(accessKeyId, secretAccessKey), region: region });
  return ssm.getParameter({ Name: parameterName }).promise();
};
