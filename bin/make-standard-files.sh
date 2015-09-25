#!/usr/bin/env bash

set -e

DIST="dist"
mkdir -p "${DIST}"

for mode in es5 es6 es5-dom es6-dom node; do
    node --harmony src/CLI.js --env ${mode} -o ${DIST}/${mode}.json
done