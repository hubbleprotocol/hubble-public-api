import { Credentials, DynamoDB, SSM } from 'aws-sdk';

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

export const getParameter = (parameterName: string, accessKeyId: string, secretAccessKey: string, region: string) => {
  const ssm = new SSM({ credentials: new Credentials(accessKeyId, secretAccessKey), region: region });
  return ssm.getParameter({ Name: parameterName }).promise();
};
