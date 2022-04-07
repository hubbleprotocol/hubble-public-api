CREATE TABLE api.borrowing_market_state
(
    "id"       int                      NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    raw_json   jsonb                    NOT NULL,
    created_on timestamp with time zone NOT NULL,
    cluster_id int                      NOT NULL,
    CONSTRAINT fk__borrowing_market_state_cluster_id__cluster_id FOREIGN KEY (cluster_id) REFERENCES api.cluster ("id"),
    CONSTRAINT pk_borrowing_market_state PRIMARY KEY ("id")
);

CREATE TABLE api.staking_pool_state
(
    "id"       int                      NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    raw_json   jsonb                    NOT NULL,
    created_on timestamp with time zone NOT NULL,
    cluster_id int                      NOT NULL,
    CONSTRAINT fk__staking_pool_state_cluster_id__cluster_id FOREIGN KEY (cluster_id) REFERENCES api.cluster ("id"),
    CONSTRAINT pk_staking_pool_state PRIMARY KEY ("id")
);

CREATE TABLE api.stability_pool_state
(
    "id"       int                      NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    raw_json   jsonb                    NOT NULL,
    created_on timestamp with time zone NOT NULL,
    cluster_id int                      NOT NULL,
    CONSTRAINT fk__stability_pool_state_cluster_id__cluster_id FOREIGN KEY (cluster_id) REFERENCES api.cluster ("id"),
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
    CONSTRAINT pk_stability_provider PRIMARY KEY ("id"),
    CONSTRAINT fk__stability_provider_owner_id__owner_id FOREIGN KEY (owner_id) REFERENCES api.owner ("id")
);

CREATE INDEX idx__stability_provider__owner_id ON api.stability_provider
(
 owner_id
    );