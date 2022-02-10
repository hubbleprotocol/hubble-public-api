# Hubble Public API

Hubble Public API is a TypeScript API that serves public data of the Hubble Protocol.

## Development

### Local API Setup
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

### Local DynamoDB Setup

Our scheduled Netlify function [snapshot.ts](src/netlify/functions/snapshot.ts) saves metrics to DynamoDB. 
If you want to test this locally without using actual AWS service you can use docker to run a local DynamoDB instance:

```shell
# go to docker folder
cd hubble-public-api/docker

# spin up DynamoDB locally with persistent database data in hubble-public-api/docker/dynamodb/data/shared-local-instance.db
docker-compose up 

# create required tables - this is only required once after first setup, all the data will be persisted on disk
chmod +x create-dynamodb-tables.sh
./create-dynamodb-tables.sh
```

Local instance will be started on http://localhost:8000.

Before you can invoke the Netlify functions you will also have to add this environment variable to `.env` file (see `.env.example`):

```dotenv
DYNAMODB_ENDPOINT=http://localhost:8000
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

### Metrics History

Get `mainnet-beta` metrics of Hubble Protocol:

```http request
GET https://api.hubbleprotocol.io/history
```

You may also specify the environment (`mainnet-beta`[default],`devnet`,`localnet`,`testnet`) by using an `env` query parameter:

```http request
GET https://api.hubbleprotocol.io/history?env=devnet
```

History endpoint will only return the historical data of the past month by default. 
If you need more/less data you can also use either the `from` or/and `to` query parameters to query by date.
Both dates should be specified in their [epoch](https://en.wikipedia.org/wiki/Epoch_(computing)) form.

```http request
GET https://api.hubbleprotocol.io/history?from=1644414557599&to=1644414562241
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