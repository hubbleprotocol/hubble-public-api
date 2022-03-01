import Decimal from 'decimal.js';

export type TimestampValueResponse = {
  // Epoch of the timestamp/datetime
  epoch: number;
  value: Decimal;
};
