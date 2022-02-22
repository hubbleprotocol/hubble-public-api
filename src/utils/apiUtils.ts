import { PublicKey } from '@solana/web3.js';
import { HandlerEvent } from '@netlify/functions';
import { ENV, Web3Client } from '../services/web3/client';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const ok = (body: any, stringifyToJson: boolean = true) => {
  return {
    statusCode: 200,
    body: stringifyToJson ? JSON.stringify(body, customReplacer) : body,
    headers: headers,
  };
};

export const unprocessable = (error: any) => {
  return {
    statusCode: 422,
    body: JSON.stringify({ error: error }),
    headers: headers,
  };
};

export const badRequest = (error: any) => {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: error }),
    headers: headers,
  };
};

export const internalError = (error: any) => {
  return {
    statusCode: 500,
    body: JSON.stringify({ error: error }),
    headers: headers,
  };
};

// The server, while acting as a gateway or proxy, received an invalid response from the upstream server it accessed in attempting to fulfill the request.
export const badGateway = (error: any) => {
  return {
    statusCode: 502,
    body: JSON.stringify({ error: error }),
    headers: headers,
  };
};

export const customError = (error: any, statusCode: number) => {
  return {
    statusCode: statusCode,
    body: JSON.stringify({ error: error }),
    headers: headers,
  };
};

function customReplacer(key: any, value: any) {
  // when stringifying solana.web3.PublicKey class to JSON, always use ToString() call, so we don't get the BigNumber representation in JSON
  if (typeof value === 'object' && value instanceof PublicKey) {
    return value.toString();
  }
  return value;
}

export const parseFromQueryParams = (
  event: HandlerEvent
): [web3Client: Web3Client | undefined, env: ENV | undefined, error: any] => {
  // use mainnet-beta as a default value
  let env: ENV = 'mainnet-beta';
  if (event?.queryStringParameters?.env) {
    env = event.queryStringParameters.env as ENV;
  }

  let web3Client: Web3Client;
  try {
    web3Client = new Web3Client(env);
  } catch (e) {
    const error = e as Error;
    console.error(error);
    return [undefined, undefined, unprocessable(error.message)];
  }

  return [web3Client, env, undefined];
};
