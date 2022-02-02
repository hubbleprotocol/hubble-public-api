import { AccountInfo, PublicKey } from '@solana/web3.js';
import { Market, MARKETS } from '@project-serum/serum';
import { MarketAccount } from '../../models/account';

const DEFAULT_DEX_ID = new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o');

export const marketAccountParser = (publicKey: PublicKey, info: AccountInfo<Buffer>) => {
  const market = MARKETS.find((m) => m.address.equals(publicKey));
  const data = Market.getLayout(market?.programId || DEFAULT_DEX_ID).decode(info.data);

  return {
    publicKey,
    ...info,
    data,
  } as MarketAccount;
};
