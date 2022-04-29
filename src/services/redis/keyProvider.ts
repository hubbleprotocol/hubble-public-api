import { ENV } from '../web3/client';

export function getStakingRedisKey(env: ENV) {
  return `staking-${env}`;
}

export function getHbbStakersRedisKey(env: ENV) {
  return `stakers-hbb-${env}`;
}

export function getUsdhStakersRedisKey(env: ENV) {
  return `stakers-usdh-${env}`;
}
