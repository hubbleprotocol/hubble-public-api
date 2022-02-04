const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const ok = (body: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify(body),
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

export const customError = (error: any, statusCode: number) => {
  return {
    statusCode: statusCode,
    body: JSON.stringify({ error: error }),
    headers: headers,
  };
};
