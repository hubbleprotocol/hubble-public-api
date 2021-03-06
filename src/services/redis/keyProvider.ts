import { ENV } from '../web3/client';
import { PublicKey } from '@solana/web3.js';

export function getStakingRedisKey(env: ENV) {
  return `staking-${env}`;
}

export function getLidoStakingRedisKey(env: ENV) {
  return `staking-lido-${env}`;
}

export function getLidoEligibleLoansRedisKey(env: ENV, start: Date, end: Date) {
  return `lido-eligible-loans-${env}-${start.toISOString()}-${end.toISOString()}`;
}

export function getLidoEligibleMonthlyLoansRedisKey(env: ENV, year: string, month: string) {
  return `lido-eligible-loans-${env}-${year}-${month}`;
}

export function getHbbStakersRedisKey(env: ENV) {
  return `stakers-hbb-${env}`;
}

export function getUsdhStakersRedisKey(env: ENV) {
  return `stakers-usdh-${env}`;
}

export function getCirculatingSupplyRedisKey(env: ENV) {
  return `circulating-supply-${env}`;
}

export function getCirculatingSupplyValueRedisKey(env: ENV) {
  return `circulating-supply-value-${env}`;
}

export function getLoanRedisKey(loan: PublicKey, env: ENV) {
  return `loan-${env}-${loan.toString()}`;
}

export function getLoanHistoryRedisKey(loan: PublicKey, env: ENV) {
  return `loan-history-${env}-${loan.toString()}`;
}

export function getLoansRedisKey(env: ENV, includeJson: boolean) {
  return includeJson ? `loans-${env}-withJson` : `loans-${env}`;
}

export function getMetricsRedisKey(env: ENV) {
  return `metrics-${env}`;
}

export function getOwnerRedisKey(owner: PublicKey, env: ENV) {
  return `owner-${env}-${owner.toString()}`;
}

export function getHistoryRedisKey(env: ENV, year: number) {
  return `history-${env}-${year}`;
}
