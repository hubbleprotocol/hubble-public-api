import { Histogram } from 'hdr-histogram-js';
import { PercentileResponse } from '../models/api/PercentileResponse';
import Decimal from 'decimal.js';
import { DistributionBinResponse } from '../models/api/DistributionBinsResponse';

export const getPercentiles = (histogram: Histogram) => {
  const percentiles: PercentileResponse[] = [];
  // Unfortunately the histogram lib does not expose the iterator and we have to use it dynamically
  // @ts-ignore
  const iterator = histogram.percentileIterator;
  iterator.reset(5);
  while (iterator.hasNext()) {
    const iterationValue = iterator.next();
    percentiles.push({
      value: new Decimal(iterationValue.valueIteratedTo),
      percentile: iterationValue.percentileLevelIteratedTo / 100,
      totalCount: iterationValue.totalCountToThisValue,
    });
  }

  return percentiles;
};

/*
  Convert d3.js bins to API response
 */
export const d3BinsToResponse = (bins: number[][], domain: { from: number; to: number }) => {
  const response: DistributionBinResponse[] = [];
  const step = domain.to / bins.length;
  for (let i = 0; i < bins.length; i++) {
    const binFrom = i * step;
    const binTo = binFrom + step;
    response.push({
      count: bins[i].length,
      index: i,
      lowerBound: binFrom,
      upperBound: binTo,
    });
  }
  return response;
};
