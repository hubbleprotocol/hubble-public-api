# 🛰 Hubble Public API

Hubble Public API is a TypeScript API (express) that serves public data of the Hubble Protocol.

## Development

### Database

We use Flyway for database migrations and PostgreSQL for data storage.

Run migrations with docker:

```shell
# Run postgresql at localhost:5432 and apply flyway migrations
docker-compose up db flyway
```

### Local API Setup
You will need to use [npm](https://www.npmjs.com/) to install the dependencies.

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

We also use Redis for caching historical results from AWS. You can use docker-compose to run an instance of Redis locally.

Run the API with npm (for debugging) and dependencies with docker-compose:

```shell
cd hubble-public-api
docker-compose up redis db flyway -d
npm run start
```

Run everything with docker-compose:

```shell
cd hubble-public-api
docker-compose up -d
```

API will be available at http://localhost:8888.

### Deployment

Deployments are done automatically, everything that gets pushed to the `master` branch will be packaged as a docker container and pushed to Hubble's DockerHub.

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
**Warning:** the maximum allowed period for the history endpoint is 1 year per request.

```http request
GET https://api.hubbleprotocol.io/history?from=1644414557599&to=1644414562241
```

### Config

Runtime config specifies all of the public configuration used by Hubble (accounts, public keys, program ids...). Also available as a [NPM package](https://www.npmjs.com/package/@hubbleprotocol/hubble-config).

Get runtime config of all environments:

```http request
GET https://api.hubbleprotocol.io/config
```

You may also filter by environment (`mainnet-beta`[default],`devnet`,`localnet`,`testnet`) by using an `env` query parameter:

```http request
GET https://api.hubbleprotocol.io/config?env=devnet
```

### IDL

Get a list of all Hubble IDLs (Interface Description Language) generated by Anchor. Also available as a [NPM package](https://www.npmjs.com/package/@hubbleprotocol/hubble-idl).

```http request
GET https://api.hubbleprotocol.io/idl
```

### Circulating Supply Value (HBB)

Get circulating supply value of HBB (number of HBB issued * HBB price).
This is also included in the `/metrics` endpoint, but we need this for external services like CoinMarketCap. 

```http request
GET https://api.hubbleprotocol.io/circulating-supply-value
```

You may also filter by environment (`mainnet-beta`[default],`devnet`,`localnet`,`testnet`) by using an `env` query parameter:

```http request
GET https://api.hubbleprotocol.io/circulating-supply-value?env=devnet
```

### Circulating Supply (HBB)

Get circulating supply of HBB (number of HBB issued).
This is also included in the `/metrics` endpoint, but we need this for external services like CoinGecko.

```http request
GET https://api.hubbleprotocol.io/circulating-supply
```

You may also filter by environment (`mainnet-beta`[default],`devnet`,`localnet`,`testnet`) by using an `env` query parameter:

```http request
GET https://api.hubbleprotocol.io/circulating-supply?env=devnet
```

### API Version

Get current version of the API.

```http request
GET https://api.hubbleprotocol.io/version
```

### Maintenance mode

Get maintenance mode parameter that specifies if Hubble webapp/smart contracts are in maintenance mode.  

```http request
GET https://api.hubbleprotocol.io/maintenance-mode
```

### Borrowing version

Get borrowing version parameter that specifies the current version of the borrowing market state (smart contracts).

```http request
GET https://api.hubbleprotocol.io/borrowing-version
```

### Loans

You may use the `env` query param for all of the methods specified below (`mainnet-beta`[default],`devnet`,`localnet`,`testnet`).

Get a list of all loans and their values from on-chain Hubble data:

```http request
GET https://api.hubbleprotocol.io/loans?env=mainnet-beta
```

Get specific loan data:

```http request
// GET https://api.hubbleprotocol.io/loans/:pubkey
GET https://api.hubbleprotocol.io/loans/HrwbdQYwSnAyVpVHuGQ661HiNbWmGjDp5DdDR9YMw7Bu
```

Get a specific user's list of loans by specifying their public key: 

```http request
// GET https://api.hubbleprotocol.io/owners/:pubkey/loans
GET https://api.hubbleprotocol.io/owners/HrwbdQYwSnAyVpVHuGQ661HiNbWmGjDp5DdDR9YMw7Bu/loans
```

Get specific loan's history data:

```http request
// GET https://api.hubbleprotocol.io/loans/:pubkey/history
GET https://api.hubbleprotocol.io/loans/HrwbdQYwSnAyVpVHuGQ661HiNbWmGjDp5DdDR9YMw7Bu/history
```

### Staking

You may use the `env` query param for all of the methods specified below (`mainnet-beta`[default],`devnet`,`localnet`,`testnet`).

Get HBB and USDH staking stats (APR, APY):

```http request
GET https://api.hubbleprotocol.io/staking
```

Get all HBB stakers (grouped by owner public key):

```http request
GET https://api.hubbleprotocol.io/staking/hbb/users
```
