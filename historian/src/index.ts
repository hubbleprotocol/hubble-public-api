import logger from './services/logger';

logger.info('Starting hubble historian - lets take a historical snapshot');

(async () => {
  try {
    //TODO:
    // 1.
    // - get current utc timestamp
    // - get /loans?env=mainnet-beta
    // - save loans to db
    // 2.
    // - get current utc timestamp
    // - get /loans?env=devnet
    // - save loans to db
  } catch (e) {
    logger.error('Error occurred during historical snapshot', e);
    process.exit(1);
  }
})();
