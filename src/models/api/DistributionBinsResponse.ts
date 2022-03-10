export type DistributionBinResponse = {
  // Total number of items in bin
  count: number;
  // Index of bin in relation to all bins (for sorting)
  index: number;
  // Lower bound of bin values
  lowerBound: number;
  // Upper bound of bin values
  upperBound: number;
};
