import { Handler } from '@netlify/functions';
import { ok } from '../../utils/apiUtils';
import { BORROWING_IDL } from '@hubbleprotocol/hubble-idl';

export const handler: Handler = async (event, context) => {
  const idls = [BORROWING_IDL]; // add other IDLs in the future...
  return ok(idls);
};
