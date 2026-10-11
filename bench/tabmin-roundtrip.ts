// Exhaustive-ish round-trip test for the TABMIN layout transform (no compression involved).
import { parseTable, transposeTable, untransposeTable } from '../src/lib/omega/tabmin';
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const alphabet = ['a', 'b', '0', '1', '.', '-', ' ', 'é', 'ж', '', 'x y', '[]', '\t'];
let pass = 0, fail = 0, ineligibleOk = 0;
for (let t = 0; t < 4000; t++) {
  const w = 2 + Math.floor(rnd() * 6), h = 2 + Math.floor(rnd() * 12);
  const rows: string[][] = [];
  for (let r = 0; r < h; r++) {
    const row: string[] = [];
    for (let c = 0; c < w; c++) {
      let s = ''; const L = Math.floor(rnd() * 5);
      for (let k = 0; k < L; k++) s += alphabet[Math.floor(rnd() * alphabet.length)];
      row.push(s.replace(/[,\n\r"]/g, ''));
    }
    rows.push(row);
  }
  const T = rows.map(r => r.join(',')).join('\n') + '\n';
  const parsed = parseTable(T);
  const colText = transposeTable(parsed!);
  const back = untransposeTable(colText);
  if (parsed && back === T) pass++; else { fail++; if (fail < 4) console.log('FAIL', JSON.stringify(T)); }
}
for (const bad of ['a,b\nc\n', 'a,b', 'a\nb\n', 'a,"b"\nc,d\n', 'a,b\r\nc,d\n', 'a,b\nc,d']) {
  if (parseTable(bad) === null) ineligibleOk++; else console.log('should be ineligible', JSON.stringify(bad));
}
console.log(JSON.stringify({ roundTripPass: pass, roundTripFail: fail, ineligibleRejected: ineligibleOk, of: 6 }));
