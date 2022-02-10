import { TimestampValueResponse } from './TimestampValueResponse';

export type HistoryResponse = {
  // History start date in epoch
  startDate: number;
  // History end date in epoch
  endDate: number;
  // Number of borrowers through history
  borrowersHistory: TimestampValueResponse[];
  // HBB price through history
  hbbPriceHistory: TimestampValueResponse[];
  // Number of HBB holders through history
  hbbHoldersHistory: TimestampValueResponse[];
  // Number of loans through history
  loansHistory: TimestampValueResponse[];
  // Total USDH issued through history
  usdhHistory: TimestampValueResponse[];
};
