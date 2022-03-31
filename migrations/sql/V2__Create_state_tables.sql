CREATE TABLE api.borrowing_market_state
(
    "id"       int                      NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    raw_json   jsonb                    NOT NULL,
    created_on timestamp with time zone NOT NULL,
    CONSTRAINT pk_borrowing_market_state PRIMARY KEY ("id")
);

CREATE TABLE api.staking_pool_state
(
    "id"       int                      NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    raw_json   jsonb                    NOT NULL,
    created_on timestamp with time zone NOT NULL,
    CONSTRAINT pk_staking_pool_state PRIMARY KEY ("id")
);

CREATE TABLE api.stability_pool_state
(
    "id"       int                      NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    raw_json   jsonb                    NOT NULL,
    created_on timestamp with time zone NOT NULL,
    CONSTRAINT pk_stability_pool_state PRIMARY KEY ("id")
);

CREATE TABLE api.stability_provider
(
    "id"                        int                      NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    version                     numeric                  NOT NULL,
    stability_pool_state_pubkey text                     NOT NULL,
    owner_id                    int                      NOT NULL,
    user_id                     numeric                  NOT NULL,
    deposited_stablecoin        numeric                  NOT NULL,
    created_on                  timestamp with time zone NOT NULL,
    raw_json                    jsonb                    NOT NULL,
    CONSTRAINT loan_PK PRIMARY KEY ("id"),
    CONSTRAINT fk__owner_id_owner_id FOREIGN KEY (owner_id) REFERENCES api.owner ("id")
);

CREATE INDEX idx__stability_provider__owner_id ON api.stability_provider
    (
     owner_id
        );