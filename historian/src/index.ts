import logger from './services/logger';
import { getOrInsertCluster, getOrInsertOwner, insertLoans, testConnection } from './services/database';
import axios from 'axios';
import { LoanResponse } from './models/LoanResponse';
import { groupBy } from './utils/arrayUtils';

const apiUrl =
  process.env.NODE_ENV === 'production' ? 'https://new-api.hubbleprotocol.io' : 'https://api.dev.hubbleprotocol.io';
const api = axios.create({ baseURL: apiUrl });
const clusters = ['mainnet-beta', 'devnet'];

logger.info({ message: 'Starting hubble historian' });

(async () => {
  try {
    await testConnection();
  } catch (e) {
    logger.error('Could not connect to Postgres database');
    throw e;
  }
  for (const cluster of clusters) {
    try {
      const clusterDto = await getOrInsertCluster(cluster);

      let timestamp = new Date();
      logger.info({ message: 'getting data from hubble api', apiUrl, cluster });
      const loans = (await api.get<LoanResponse[]>(`/loans?env=${cluster}`)).data;
      logger.info({ message: `got ${loans.length} loans from hubble api`, apiUrl, cluster });

      for (const [owner, ownerLoans] of groupBy(loans, (x) => x.owner)) {
        logger.debug({ message: 'inserting loan data', owner, numberOfLoans: ownerLoans.length });
        const ownerDto = await getOrInsertOwner(owner, clusterDto.id);
        await insertLoans(ownerDto, ownerLoans, timestamp);
      }
      logger.info({ message: 'finished snapshots for cluster', cluster });
    } catch (e) {
      logger.error('Error occurred during historical snapshot', e);
    }
  }
  process.exit();
})();
