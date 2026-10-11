# Readability scorer for the column-arm fixtures. Compares a hand decode with the hidden original.
# Output: cell-level and row-level exactness, plus the blindness status declared for each decode.
import json, sys
FIX = [
  # (table, decode file, status)  status: 'blind' = written before hidden/ was opened; 'post-hoc' = corrected after cmp
  (1, 'decode/dec_1_rebuilt.csv', 'blind (from visible only, earlier turn)'),
  (2, 'decode/dec_2.csv', 'blind (written before hidden/ opened)'),
  (3, 'decode/dec_3_firstpass.csv', 'blind (first pass, written before hidden/ opened)'),
  (3, 'decode/dec_3_corrected.csv', 'post-hoc (2 slips corrected after cmp; NOT blind)'),
]
out = []
for t, path, status in FIX:
    a = [l.rstrip('\n').split(',') for l in open(path)]
    b = [l.rstrip('\n').split(',') for l in open(f'hidden/table_{t}.csv')]
    cells = sum(len(r) for r in b)
    bad = [(i + 1, j + 1) for i, (ra, rb) in enumerate(zip(a, b)) for j, (x, y) in enumerate(zip(ra, rb)) if x != y]
    shape_ok = len(a) == len(b) and all(len(r) == len(b[0]) for r in a)
    bad_rows = sorted({i for i, _ in bad})
    out.append({
        'table': t, 'decode': path, 'status': status, 'shape': f'{len(b)}x{len(b[0])}',
        'shape_ok': shape_ok, 'cells': cells, 'wrong_cells': len(bad), 'wrong_cell_list': bad,
        'rows_exact': len(b) - len(bad_rows), 'byte_exact': open(path).read() == open(f'hidden/table_{t}.csv').read(),
    })
json.dump(out, open('receipts-z8.json', 'w'), indent=1)
for r in out:
    print(f"table {r['table']} {r['decode']:<30} exact={r['byte_exact']!s:<5} wrong_cells={r['wrong_cells']}/{r['cells']} rows_exact={r['rows_exact']}/{r['shape'].split('x')[0]}  [{r['status']}]")
