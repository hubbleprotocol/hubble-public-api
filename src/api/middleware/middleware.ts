import { NextFunction, Request, Response } from 'express';
import { ENV } from '../../services/web3/client';
import { badRequest } from '../../utils/apiUtils';
import * as basicAuth from 'express-basic-auth';
import { getEnvOrThrowInProduction } from '../../utils/envUtils';

const validateSolanaCluster = (req: Request<any, any, any, any, any>, res: Response, next: NextFunction) => {
  if (req.query.env) {
    const env = req.query.env as ENV;
    switch (env) {
      case 'mainnet-beta':
      case 'devnet': {
        next();
        break;
      }
      default: {
        res.status(badRequest).send(`Solana cluster ${env} is not supported. Try mainnet-beta/devnet instead.`);
        return;
      }
    }
  } else {
    // no query params mean we'll use default solana cluster -> mainnet-beta
    next();
  }
};

const authorizedRoute = basicAuth.default({
  challenge: true,
  users: { hubble: getEnvOrThrowInProduction('AUTH_KEY', 'development') },
  unauthorizedResponse: 'Not authorized for this request. Please include the basic auth headers.',
});

export const middleware = { validateSolanaCluster, authorizedRoute };
