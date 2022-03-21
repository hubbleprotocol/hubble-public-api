import Router from 'express-promise-router';
import circulatingSupplyRoute from './circulating-supply';
import configRoute from './config';
import circulatingSupplyValueRoute from './circulating-supply-value';
import historyRoute from './history';
import idlRoute from './idl';
import metricsRoute from './metrics';
import { Request } from 'express';
import versionRoute from './version';
import healthRoute from './health';
import maintenanceModeRoute from './maintenance-mode';
import borrowingVersionRoute from './borrowing-version';
import loansRoute from './loans';

const routes = Router();

const routesList: { endpoint: string; route: any }[] = [];
routesList.push({ endpoint: '/circulating-supply', route: circulatingSupplyRoute });
routesList.push({ endpoint: '/circulating-supply-value', route: circulatingSupplyValueRoute });
routesList.push({ endpoint: '/config', route: configRoute });
routesList.push({ endpoint: '/history', route: historyRoute });
routesList.push({ endpoint: '/idl', route: idlRoute });
routesList.push({ endpoint: '/metrics', route: metricsRoute });
routesList.push({ endpoint: '/version', route: versionRoute });
routesList.push({ endpoint: '/health', route: healthRoute });
routesList.push({ endpoint: '/maintenance-mode', route: maintenanceModeRoute });
routesList.push({ endpoint: '/borrowing-version', route: borrowingVersionRoute });
routesList.push({ endpoint: '/', route: loansRoute });

for (const route of routesList) {
  routes.use(route.endpoint, route.route);
}

routes.get('/', async (request: Request<never, string, never, never>, response) => {
  response.send(
    `<html lang="en">${routesList.map((x) => `<li><a href="${x.endpoint}">${x.endpoint}</a></li>`).join('')}</html>`
  );
});

export default routes;
