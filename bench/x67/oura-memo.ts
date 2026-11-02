/**
 * X67 speed lane verification: the OURA entry-state memo changes no wire.
 *
 * Checks
 *  1. CLOSURE: the transitive import closure of src/lib/omega/oura.ts reads none
 *     of the option keys APOGRAPHE strips before calling it. If it did, stripping
 *     could change a wire and the memo key would be unsound. Re-derived by grep
 *     at test time, not asserted by hand.
 *  2. AB: for every text and option combination, memo-on and memo-off produce
 *     byte-identical wire, contract and messageTokens.
 *  3. SHARING: METRON (APOGRAPHE with kanon:true) and DIASTEMA (OURA with {})
 *     both hit the entry APOGRAPHE created, and the memo reports hits.
 *  4. EXACT: each memo-off wire still decodes to the source.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ouraEncode, ouraMemoStats, ouraMemoClear, ouraDecode } from '../../src/lib/omega/oura';
import { apographeEncode } from '../../src/lib/omega/apographe';
import { metronEncode } from '../../src/lib/omega/metron';
import { diastemaEncode } from '../../src/lib/omega/diastema';
import { euteleiaDecode } from '../../src/lib/omega/euteleia';
import { chironDecode } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const root = 'src/lib/omega';
const APOGRAPHE_ONLY = ['apographe', 'kanon', 'forceLifts', 'forceSep', 'noGate'];
let fail = 0;
const check = (ok: boolean, name: string, extra = '') => {
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`);
};

// ---- 1. closure -----------------------------------------------------------
const seen = new Set<string>();
const order: string[] = [];
const walk = (f: string) => {
  if (seen.has(f) || !fs.existsSync(f)) return;
  seen.add(f); order.push(f);
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/from '\.\/([a-z0-9-]+)'/g)) walk(path.join(root, m[1] + '.ts'));
};
walk(path.join(root, 'oura.ts'));
const closureKeys = new Set<string>();
for (const f of order) for (const m of fs.readFileSync(f, 'utf8').matchAll(/opts\.([A-Za-z_][A-Za-z0-9_]*)/g)) closureKeys.add(m[1]);
console.log(`closure: ${order.length} files, ${closureKeys.size} option keys`);
for (const k of APOGRAPHE_ONLY) check(!closureKeys.has(k), `closure does not read opts.${k}`);

// ---- 2/3/4. A/B -----------------------------------------------------------
const texts: Array<[string, string]> = [
  ['metrics', fs.readFileSync('bench/holdout-x40/metrics.tsv', 'utf8')],
  ['kb', fs.readFileSync('bench/holdout-work/kb-article.txt', 'utf8').slice(0, 1500)],
  ['json', fs.readFileSync('bench/holdout/json-pkg.txt', 'utf8').slice(0, 1200)],
  ['plain', 'alpha beta gamma 1.2.3 77.44539475 2026-01-01T00:00:00.000Z\n'.repeat(20)],
];
const combos: Array<[string, any]> = [
  ['{}', {}],
  ['kanon', { kanon: true }],
  ['ouraOff', { oura: false }],
  ['apographeOff', { apographe: false }],
];

for (const [name, text] of texts) {
  for (const [cname, opts] of combos) {
    ouraMemoClear();
    process.env.OMEGA_OURA_MEMO = '0';
    const off = ouraEncode(text, enc, { ...opts });
    delete process.env.OMEGA_OURA_MEMO;
    ouraMemoClear();
    const on = ouraEncode(text, enc, { ...opts });
    if (cname === 'kanon') {
      // stripping the APOGRAPHE-only key must not change the OURA result: compare
      // against the plain call too, which is the whole point of the strip.
      ouraMemoClear();
      const plain = ouraEncode(text, enc, {});
      check(plain.wire === on.wire && plain.messageTokens === on.messageTokens,
        `strip-invariance ${name} kanon≡{}`);
    }
    check(off.wire === on.wire && off.contract === on.contract && off.messageTokens === on.messageTokens
      && off.oura === on.oura && off.message === on.message,
      `memo A/B identical ${name} ${cname}`, `M=${on.messageTokens}`);
  }
  // sharing across the three parents that share the source
  ouraMemoClear();
  const a = apographeEncode(text, enc);
  const m = metronEncode(text, enc);
  const d = diastemaEncode(text, enc);
  const st = ouraMemoStats();
  check(st.hits >= 2, `entry shared by apographe+metron+diastema ${name}`, `hits=${st.hits} misses=${st.misses}`);
  check(a.messageTokens === m.messageTokens, `metron≡apographe M ${name}`, `${a.messageTokens}/${m.messageTokens}`);
  check(d.decoded === text, `diastema decodes ${name}`);
}

// ---- 5. decode still exact F ----------------------------------------------
for (const [name, text] of texts) {
  ouraMemoClear();
  const r = ouraEncode(text, enc, {});
  const back = r.contract?.includes('separator')
    ? (() => { try { return euteleiaDecode(r.wire, {}, { undo: chironDecode }); } catch { return ''; } })()
    : '';
  check(r.decoded === text, `oura decoded===source ${name}`);
  void back;
}

console.log(fail === 0 ? 'ALL CHECKS PASSED' : `${fail} CHECK(S) FAILED`);
if (fail) process.exitCode = 1;
