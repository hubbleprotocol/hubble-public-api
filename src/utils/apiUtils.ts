import { PublicKey } from '@solana/web3.js';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const ok = (body: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify(body, customReplacer),
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

export const internalError = (error: any) => {
  return {
    statusCode: 500,
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
