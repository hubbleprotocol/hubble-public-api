if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

import logger, { loggingStream } from './services/logger';
import express from 'express';
import routes from './api/routes';
import morgan from 'morgan';
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(
  morgan('short', {
    // use winston logging stream for morgan HTTP requests
    stream: loggingStream,
    // do not log /health and /version endpoints
    // those are called every few seconds by k8s health checks and would spam logs
    skip: (req) => {
      return req.baseUrl === '/health' || req.baseUrl === '/version';
    },
  })
);

app.use(routes);

const port = process.env.SERVER_PORT || 8888;
app.listen(port, () => {
  logger.info(`✅️[server] Server is running at http://localhost:${port}`);
});
