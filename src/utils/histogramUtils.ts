import { Histogram } from 'hdr-histogram-js';
import { PercentileResponse } from '../models/api/PercentileResponse';
import Decimal from 'decimal.js';

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
