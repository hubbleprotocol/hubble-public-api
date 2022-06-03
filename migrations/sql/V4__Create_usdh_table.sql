CREATE TABLE api.usdh
(
    "id"       int                      NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    usdh_issued   numeric                    NOT NULL,
    created_on timestamp with time zone NOT NULL,
    cluster_id int                      NOT NULL,
    CONSTRAINT fk__usdh_cluster_id__cluster_id FOREIGN KEY (cluster_id) REFERENCES api.cluster ("id"),
    CONSTRAINT pk_usdh PRIMARY KEY ("id")
);