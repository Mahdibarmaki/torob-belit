#!/bin/sh
set -eu

task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
for task_node in "$task_root"/.tools/node-*/bin/node; do
  if [ -x "$task_node" ]; then
    PATH="$(dirname -- "$task_node"):$PATH"
    export PATH
    break
  fi
done

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Install Node.js 24 (see .nvmrc) before running Flight AI.' >&2
  exit 1
fi

cd "$task_root"
exec npm run dev -- "$@"
