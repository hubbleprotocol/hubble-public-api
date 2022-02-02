# Hubble Public API

Hubble Public API is a TypeScript API that serves public data of the Hubble Protocol.

## Development

### Local Setup
You will need to use [npm](https://www.npmjs.com/) to install the dependencies. 
You will also need to install [Netlify CLI](https://docs.netlify.com/cli/get-started/) to run and debug locally.

We are using private nodes without rate limit for fetching mainnet-beta and devnet chain data.
You will have to add an `.env` file in the root of this repository with the correct environment variables inside.
Please take a look at the example `.env.example` file:

```shell
cd hubble-public-api
cp .env.example .env
# edit .env with actual endpoints with your favorite editor
# nano .env  
# code .env
# ...
```

Run the application by launching a Netlify development server:

```shell
cd hubble-public-api
npm run netlify
```

### Deployment

[![Netlify Status](https://api.netlify.com/api/v1/badges/92079dd2-43ae-4966-b3b6-d1b9d009d473/deploy-status)](https://app.netlify.com/sites/hubble-api/deploys)

All of the API routes should be added to the `src/netlify/functions` folder. Deployments are done automatically by using Netlify.

Everything that gets pushed to the `master` branch will be deployed to the production URL: https://api.hubbleprotocol.io.

Make sure to add environment variables `MAINNET_ENDPOINT` and `DEVNET_ENDPOINT` using Netlify site settings UI.

## Usage

### Metrics

Get `mainnet-beta` metrics of Hubble Protocol:

```http request
GET https://api.hubbleprotocol.io/metrics
```

You may also specify the environment (`mainnet-beta`[default],`devnet`,`localnet`,`testnet`) by using an `env` query parameter:

```http request
GET https://api.hubbleprotocol.io/metrics?env=devnet
```

### Config

Runtime config specifies all of the public configuration used by Hubble (accounts, public keys, program ids...). 

Get runtime config of all environments:

```http request
GET https://api.hubbleprotocol.io/config
```

You may also filter by environment (`mainnet-beta`[default],`devnet`,`localnet`,`testnet`) by using an `env` query parameter:

```http request
GET https://api.hubbleprotocol.io/config?env=devnet
```