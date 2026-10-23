/** X42 screen 3 — clause cost variants for the vix and aapl template sets. */
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
const enc = (process.env.ENC || 'o200k_base') as EncodingName;

const sets = {
  vix: ['1990-0#-##', '##.##0000'],
  aapl: ['2014-##-##', '1##.#######'],
};
const widths: Record<string, number[][]> = {
  vix: [[3], [4]],
  aapl: [[4], [9]],
};
// SYSTOLE's clause for the same shapes (what APOCOPE replaces).
const systoleForms: Record<string, string[]> = {
  vix: ['8:####-##-##', '8:##.######'],
  aapl: ['8:####-##-##', '10:###.#######'],
};

const variants: Array<[string, (ts: string[]) => string]> = [
  ['A keep:tmpl, expl   ', (ts) => 'Restore numeric templates (# = a kept digit): ' + ts.join(', ') + '.'],
  ['B keep:tmpl, short  ', (ts) => 'Restore ' + ts.join(', ') + ' (# = kept digit).'],
  ['C bare tmpl, short  ', (ts) => 'Restore ' + ts.join(', ') + ' (# = kept digit).'],
  ['D keep:tmpl, noexpl ', (ts) => 'Restore ' + ts.join(', ') + '.'],
  ['E tmpl only         ', (ts) => 'Restore ' + ts.join(', ') + '.'],
  ['F digits->          ', (ts) => 'Restore: ' + ts.join('; ') + '.'],
];

for (const [name, tmpls] of Object.entries(sets)) {
  console.log(`\n=== ${name} ===`);
  const withW = tmpls.map((t, i) => `${widths[name][i][0]}:${t}`);
  const sysC = 'Restore: ' + systoleForms[name].join(', ') + '.';
  const base = countTokens(' print only.', enc);
  const sysTok = countTokens(' ' + sysC + ' print only.', enc) - base;
  console.log(`  SYSTOLE clause (${systoleForms[name].length} tmpl): ${String(sysTok).padStart(3)} tok  | ${sysC}`);
  for (const [vn, fn] of variants) {
    const arr = (vn[0] === 'B' || vn[0] === 'C' || vn[0] === 'A') ? withW
      : (vn[0] === 'E' ? tmpls : withW);
    const c = fn(arr);
    const n = countTokens(' ' + c + ' print only.', enc) - base;
    console.log(`  ${vn} ${String(n).padStart(3)} tok (delta ${n - sysTok >= 0 ? '+' : ''}${n - sysTok})  | ${c}`);
  }
}
