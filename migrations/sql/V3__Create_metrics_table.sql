CREATE TABLE api.metrics
(
    "id"       int                      NOT NULL GENERATED ALWAYS AS IDENTITY (
        start 1
        ),
    raw_json   jsonb                    NOT NULL,
    created_on timestamp with time zone NOT NULL,
    cluster_id int                      NOT NULL,
    CONSTRAINT fk__metrics_cluster_id__cluster_id FOREIGN KEY (cluster_id) REFERENCES api.cluster ("id"),
    CONSTRAINT pk_metrics PRIMARY KEY ("id")
);