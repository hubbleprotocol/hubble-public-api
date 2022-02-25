import 'dotenv/config';
import express from 'express';
import routes from './api/routes';
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// @ts-ignore
app.use(function (err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  return res.status(err.status || 500).render('500');
});

app.use(routes);

const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});

//TODO:
// - history caching with redis
// - update readme
// - create dockerfile (include current git hash as API_VERSION)
// - create automated deployment workflow that builds docker image
// - optimize /metrics endpoint
// - start using decimal.js everywhere
