import { ENV } from '../services/web3/client';

export const MAINTENANCE_MODE_DEV = 'maintenance-mode-devnet';
export const MAINTENANCE_MODE_MAINNET = 'maintenance-mode-mainnet';

export const getMaintenanceModeParameterName = (env: ENV) => {
  switch (env) {
    case 'mainnet-beta':
      return MAINTENANCE_MODE_MAINNET;
    case 'devnet':
      return MAINTENANCE_MODE_DEV;
    case 'localnet':
    case 'testnet':
      throw Error('Localnet/testnet maintenance mode is not supported');
  }
};
