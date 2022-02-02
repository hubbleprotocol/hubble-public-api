import { ENV } from '../../services/web3/client';
import { BorrowingConfig } from './BorrowingConfig';

export type HubbleConfig = {
  env: ENV;
  borrowing: BorrowingConfig;
};
