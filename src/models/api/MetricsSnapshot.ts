import { MetricsResponse } from './MetricsResponse';

export type MetricsSnapshot = {
  environment: string;
  createdOn: number;
  metrics: MetricsResponse;
};
