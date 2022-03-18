CREATE TABLE api.cluster
(
    "id" int  NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    name text NOT NULL,
    CONSTRAINT cluster_PK PRIMARY KEY ("id")
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
    CONSTRAINT owner_PK PRIMARY KEY ("id"),
    CONSTRAINT FK_cluster_owner FOREIGN KEY (cluster_id) REFERENCES api.cluster ("id")
);

CREATE INDEX fk_cluster_owner ON api.owner
    (
     cluster_id
        );


CREATE TABLE api.collateral
(
    "id"               int     NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    deposited_quantity numeric NOT NULL,
    inactive_quantity  numeric NOT NULL,
    price              numeric NOT NULL,
    token_id           int     NOT NULL,
    CONSTRAINT pk_collateral PRIMARY KEY ("id"),
    CONSTRAINT fk_token_collateral FOREIGN KEY (token_id) REFERENCES api."token" ("id")
);

CREATE INDEX fk_token_collateral ON api.collateral
    (
     token_id
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
    CONSTRAINT loan_PK PRIMARY KEY ("id"),
    CONSTRAINT FK_owner_loan FOREIGN KEY (owner_id) REFERENCES api.owner ("id")
);

CREATE INDEX FK_owner_loan ON api.loan
    (
     owner_id
        );


CREATE TABLE api.loan_collateral
(
    "id"          int NOT NULL GENERATED ALWAYS AS IDENTITY,
    loan_id       int NOT NULL,
    collateral_id int NOT NULL,
    CONSTRAINT PK_loan_collateral PRIMARY KEY ("id"),
    CONSTRAINT fk_collateral_loan_collateral FOREIGN KEY (collateral_id) REFERENCES api.collateral ("id"),
    CONSTRAINT fk_loan_loan_collateral FOREIGN KEY (loan_id) REFERENCES api.loan ("id")
);

CREATE INDEX fk_collateral_loan_collateral ON api.loan_collateral
    (
     collateral_id
        );

CREATE INDEX fk_loan_loan_collateral ON api.loan_collateral
    (
     loan_id
        );