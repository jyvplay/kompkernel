#!/usr/bin/env bash
# Rebuild the X60 public-source benchmark without vendoring AGPL-3.0 records.
set -euo pipefail
OUT="${1:-/tmp/x60-openpowerlifting-combined.csv}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for id in 1902 1903; do
  gh api "repos/sstangl/openpowerlifting/contents/meet-data/raw/${id}/original.csv" \
    -H 'Accept: application/vnd.github.raw' > "$TMP/$id.csv"
done
python3 - "$TMP/1902.csv" "$TMP/1903.csv" "$OUT" <<'PY'
import csv, sys
paths, out_path = sys.argv[1:3], sys.argv[3]
header = None
rows = []
for path in paths:
    with open(path, encoding='utf-8-sig', newline='') as f:
        table = list(csv.reader(f))
    if header is None:
        header = table[0]
    elif table[0] != header:
        raise SystemExit('source schema mismatch; refusing to merge')
    rows.extend(table[1:])
if header is None or len(rows) != 124:
    raise SystemExit(f'unexpected row count: {len(rows) if rows else 0}')
fi, a, b = header.index('Full Name'), header.index('First Name'), header.index('Last Name')
bad = [i for i, row in enumerate(rows, 2) if row[fi] != row[a] + ' ' + row[b]]
if len(bad) != 2:
    raise SystemExit(f'unexpected exact-law exception count: {len(bad)}')
with open(out_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f, lineterminator='\n')
    writer.writerow(header)
    writer.writerows(rows)
print(f'rows={len(rows)} columns={len(header)} exactExceptions={len(bad)} output={out_path}')
PY
sha256sum "$OUT"
