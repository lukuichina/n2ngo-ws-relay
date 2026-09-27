#!/bin/bash
# Sync the working source tree into the directory the Worker actually runs from.
#
#   source of truth: /root/github/p2p/n2ngo-ws-relay
#   runtime:         /root/github/n2ngo-ws-relay
#
# The runtime directory is a separate tree, not a symlink, so every schema or
# code change must be copied over or the running Worker keeps serving the old
# build. node_modules, .wrangler state and the runtime's own scratch files are
# left untouched -- they belong to the running process, not to the source.
set -euo pipefail

SRC=/root/github/p2p/n2ngo-ws-relay
DST=/root/github/n2ngo-ws-relay

[ -d "$SRC" ] || { echo "source tree missing: $SRC" >&2; exit 1; }
[ -d "$DST" ] || { echo "runtime tree missing: $DST" >&2; exit 1; }
[ "$SRC" != "$DST" ] || { echo "source and runtime are the same path" >&2; exit 1; }

# rsync is not installed in this environment, so walk the source tree and copy
# each file that differs.
cd "$SRC"
find . -type f \
    -not -path './node_modules/*' \
    -not -path './.wrangler/*' \
    -not -path './.git/*' \
    -not -name '*.bak' \
    | sort | while read -r f; do
    if [ ! -f "$DST/$f" ] || ! cmp -s "$f" "$DST/$f"; then
        mkdir -p "$DST/$(dirname "$f")"
        cp "$f" "$DST/$f"
        echo "  synced $f"
    fi
done

echo
echo "sync complete: $SRC -> $DST"
echo "restart the Worker for the change to take effect:"
echo "  pkill -f 'wrangler dev' && cd $DST && npx wrangler dev --ip 0.0.0.0 --port 8787"
