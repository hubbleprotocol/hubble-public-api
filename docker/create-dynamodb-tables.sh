#!/bin/sh

aws dynamodb create-table --table-name metrics \
--attribute-definitions AttributeName=environment,AttributeType=S AttributeName=createdOn,AttributeType=N \
--key-schema AttributeName=environment,KeyType=HASH AttributeName=createdOn,KeyType=RANGE \
--provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
--endpoint-url http://localhost:8000 > /dev/null

echo "Created 'metrics' table in local DynamoDB"