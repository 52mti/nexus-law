#!/bin/sh
set -e

export JWT_SECRET="${JWT_SECRET:-dev-jwt-secret-change-me}"
export KONG_NORMAL_RATE_LIMIT_PER_MINUTE="${KONG_NORMAL_RATE_LIMIT_PER_MINUTE:-60}"

# Kong image does not include envsubst; substitute with sed.
sed \
  -e "s#\${JWT_SECRET}#${JWT_SECRET}#g" \
  -e "s#\${KONG_NORMAL_RATE_LIMIT_PER_MINUTE}#${KONG_NORMAL_RATE_LIMIT_PER_MINUTE}#g" \
  /kong/kong.yml.template > /tmp/kong.yml

export KONG_DATABASE=off
export KONG_DECLARATIVE_CONFIG=/tmp/kong.yml
exec /docker-entrypoint.sh kong docker-start
