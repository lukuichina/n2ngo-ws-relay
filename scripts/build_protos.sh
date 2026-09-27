#!/bin/bash
# Regenerate src/core/protos_generated.js from protos/n2n.proto.
#
# This is the single source of truth for the wire schema: edit the .proto, run
# this, and commit both. The generated file must never be hand-edited, otherwise
# the next regeneration silently reverts it.
#
# pbjs emits a bare `from "protobufjs/minimal.js"` specifier, which does not
# resolve under the Worker's ESM bundling, so it is rewritten to the project's
# own shim at src/core/protobuf-minimal-shim.js.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=src/core/protos_generated.js
RAW=$(mktemp /tmp/protos_raw.XXXXXX.js)
trap 'rm -f "$RAW"' EXIT

# Resolve pbjs: prefer the version pinned in devDependencies, then fall back to a
# global install. Unpinned `npx pbjs` is deliberately not used -- the npm package
# named "pbjs" is an unrelated project, and a floating CLI rewrites the whole
# generated file in a different dialect.
PBJS=""
for cand in \
    node_modules/protobufjs-cli/bin/pbjs \
    "$(npm root -g 2>/dev/null)/protobufjs-cli/bin/pbjs"; do
    if [ -x "$cand" ]; then PBJS="$cand"; break; fi
done
if [ -z "$PBJS" ]; then
    echo "protobufjs-cli 2.7.0 not found." >&2
    echo "  install locally:  npm install --save-dev protobufjs-cli@2.7.0" >&2
    echo "  or globally:      npm install -g protobufjs-cli@2.7.0" >&2
    exit 1
fi

echo "using pbjs: $PBJS"
node "$PBJS" -t static-module -w es6 -o "$RAW" protos/n2n.proto
sed 's|from "protobufjs/minimal.js"|from "./protobuf-minimal-shim.js"|' "$RAW" > "$OUT"
echo "regenerated $OUT"
