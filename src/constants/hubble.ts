import { ENV } from '../services/web3/client';

export const MAINTENANCE_MODE_DEV = 'maintenance-mode-devnet';
export const MAINTENANCE_MODE_MAINNET = 'maintenance-mode-mainnet';

export const BORROWING_VERSION_DEV = 'borrowing-version-devnet';
export const BORROWING_VERSION_MAINNET = 'borrowing-version-mainnet';

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

export const getBorrowingVersionParameterName = (env: ENV) => {
  switch (env) {
    case 'mainnet-beta':
      return BORROWING_VERSION_MAINNET;
    case 'devnet':
      return BORROWING_VERSION_DEV;
    case 'localnet':
    case 'testnet':
      throw Error('Localnet/testnet maintenance mode is not supported');
  }
};
