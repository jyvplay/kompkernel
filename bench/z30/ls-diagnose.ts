// Diagnostic: why does PADTAB accept only a few blocks on ls -l output? Token-count runs, and examples of the lines that break them.
import fs from 'node:fs';
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const tok = (l: string) => l.split(' ').filter((x) => x.length > 0);
const runs: { k: number; len: number; start: number }[] = [];
for (let i = 0; i < lines.length; i++) {
  const k = tok(lines[i]).length;
  if (runs.length && runs[runs.length - 1].k === k) runs[runs.length - 1].len++;
  else runs.push({ k, len: 1, start: i });
}
const big = runs.filter((r) => r.len >= 2).sort((a, b) => b.len - a.len);
console.log('runs total', runs.length, 'runs of length>=2', big.length, 'lines in such runs', big.reduce((s, r) => s + r.len, 0), 'of', lines.length);
console.log('largest runs', big.slice(0, 5).map((r) => `k${r.k}x${r.len}`).join(' '));
const kinds: Record<string, number> = {};
for (const l of lines) { if (!l) continue; const k = tok(l).length; kinds[k] = (kinds[k] || 0) + 1; }
console.log('token-count histogram', JSON.stringify(kinds));
const k11 = lines.filter((l) => tok(l).length === 11).slice(0, 3);
console.log('sample k11 lines:'); k11.forEach((l) => console.log('  ' + JSON.stringify(l)));
const k9 = lines.filter((l) => tok(l).length === 9).slice(0, 2);
console.log('sample k9 lines:'); k9.forEach((l) => console.log('  ' + JSON.stringify(l)));
console.log('total-line count', lines.filter((l) => l.startsWith('total')).length);
