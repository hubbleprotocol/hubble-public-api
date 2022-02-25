import Router from 'express-promise-router';
import circulatingSupplyRoute from './circulating-supply';
import configRoute from './config';
import circulatingSupplyValueRoute from './circulating-supply-value';
import historyRoute from './history';
import idlRoute from './idl';
import metricsRoute from './metrics';

const routes = Router();

routes.use('/circulating-supply', circulatingSupplyRoute);
routes.use('/circulating-supply-value', circulatingSupplyValueRoute);
routes.use('/config', configRoute);
routes.use('/history', historyRoute);
routes.use('/idl', idlRoute);
routes.use('/metrics', metricsRoute);

export default routes;
