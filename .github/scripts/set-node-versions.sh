#!/usr/bin/env bash

npm_version=$(cat ./package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]')

build_version=$npm_version
if [[ "$npm_version" =~ ^.*-SNAPSHOT$ ]]; then
    build_version="$build_version-$(date +%s).${GITHUB_RUN_ID}"
fi
release_version="${build_version%-SNAPSHOT*}"

echo "Build version: $build_version"
echo "Release version: $release_version"

echo "::set-output name=build_version::$build_version"
echo "::set-output name=release_version::$release_version"

