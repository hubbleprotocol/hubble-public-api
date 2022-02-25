import express from 'express';
const app = express();
const port = process.env.PORT || 8888;
app.get('/', (req, res) => res.send('Express + TypeScript Server'));
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
