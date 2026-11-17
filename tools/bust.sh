#!/bin/sh
# Stamp every ?v=… in HTML/CSS/JS with a version (default: current short commit).
# Usage after committing changes:  sh tools/bust.sh && git commit -am "Cache-bust assets"
cd "$(dirname "$0")/.." || exit 1
V=${1:-$(git rev-parse --short HEAD)}
sed -i.bak -E "s/\?v=[A-Za-z0-9]+/?v=$V/g" *.html css/*.css js/*.js && rm -f *.bak css/*.bak js/*.bak
echo "cache version: $V"
