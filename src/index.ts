import logger, { loggingStream } from './services/logger';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

import express from 'express';
import routes from './api/routes';
const morgan = require('morgan');
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(morgan('short', { stream: loggingStream }));

app.use(routes);

const port = process.env.SERVER_PORT || 8888;
app.listen(port, () => {
  logger.info(`✅️[server] Server is running at http://localhost:${port}`);
});
