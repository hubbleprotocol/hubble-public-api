CREATE TABLE api.cluster
(
    "id" int  NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    name text NOT NULL,
    CONSTRAINT pk_cluster PRIMARY KEY ("id")
);

CREATE TABLE api."token"
(
    "id" int  NOT NULL GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    CONSTRAINT pk_token PRIMARY KEY ("id")
);

CREATE TABLE api.owner
(
    "id"       int  NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    pubkey     text NOT NULL,
    cluster_id int  NOT NULL,
    CONSTRAINT pk_owner PRIMARY KEY ("id"),
    CONSTRAINT fk__cluster_id__cluster_id FOREIGN KEY (cluster_id) REFERENCES api.cluster ("id")
);

CREATE INDEX idx__owner__cluster_id ON api.owner
    (
     cluster_id
        );

CREATE TABLE api.loan
(
    "id"                          int                      NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    user_metadata_pubkey          text                     NOT NULL,
    usdh_debt                     numeric                  NOT NULL,
    created_on                    timestamp with time zone NOT NULL,
    total_collateral_value        numeric                  NOT NULL,
    collateral_ratio              numeric                  NOT NULL,
    loan_to_value                 numeric                  NOT NULL,
    version                       numeric                  NOT NULL,
    status                        numeric                  NOT NULL,
    user_id                       numeric                  NOT NULL,
    borrowing_market_state_pubkey text                     NOT NULL,
    owner_id                      int                      NOT NULL,
    raw_json                      jsonb                    NOT NULL,
    CONSTRAINT loan_PK PRIMARY KEY ("id"),
    CONSTRAINT fk__owner_id__owner_id FOREIGN KEY (owner_id) REFERENCES api.owner ("id")
);

CREATE INDEX idx__loan__owner_id ON api.loan
    (
     owner_id
        );


CREATE TABLE api.collateral
(
    "id"                 int NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    deposited_quantity numeric NOT NULL,
    inactive_quantity  numeric NOT NULL,
    price              numeric NOT NULL,
    token_id           int NOT NULL,
    loan_id            int NOT NULL,
    CONSTRAINT pk_collateral PRIMARY KEY ( "id" ),
    CONSTRAINT fk__loan_id__loan_id FOREIGN KEY ( loan_id ) REFERENCES api.loan ( "id" ),
    CONSTRAINT fk__token_id__token_id FOREIGN KEY ( token_id ) REFERENCES api."token" ( "id" )
);

CREATE INDEX idx__collateral__loan_id ON api.collateral
    (
     loan_id
        );

CREATE INDEX idx__collateral__token_id ON api.collateral
    (
     token_id
        );