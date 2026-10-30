// X60 six-mechanism falsification portfolio on the published finance demo fixture.
// Sketch costs are contract + reduced table + mechanism payload, priced with
// o200k_base. These are idea screens, NOT parent/frontier wins; exact inverse is
// checked before reporting each sketch's token cost.
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { eirmosPlan, eirmosRestore } from '../../src/lib/omega/eirmos';

const ENC = 'o200k_base' as const;
const text = fs.readFileSync('bench/x60/fixtures/clients.csv', 'utf8');
function parseLine(line: string): string[] {
  const out: string[] = []; let i = 0;
  while (i <= line.length) {
    let v = '';
    if (line[i] === '"') {
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { v += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else v += line[i++]!;
      }
    } else {
      while (i < line.length && line[i] !== ',') v += line[i++]!;
    }
    out.push(v);
    if (i >= line.length) break;
    if (line[i] !== ',') throw new Error('CSV parse');
    i++;
    if (i === line.length) { out.push(''); break; }
  }
  return out;
}
const rawLines = text.split('\r\n');
if (rawLines.at(-1) === '') rawLines.pop();
const rows = rawLines.map(parseLine);
const header = rows[0]!;
const targetCol = header.indexOf('full_name');
const names = rows.slice(1).map((r) => r[targetCol]!);
const ePlan = eirmosPlan(text, ENC)!;
if (!ePlan || eirmosRestore(ePlan.reducedText, ePlan.spec) !== text) throw new Error('EIRMOS check failed');
const reduced = ePlan.reducedText;
const baseTokens = countTokens(text, ENC);
const result: any[] = [];
function report(name: string, contract: string, payload: string, decoded: string[], exact: boolean, mechanism: string): void {
  result.push({ name, mechanism, exact, targetRows: names.length, distinctTargets: new Set(names).size,
    baseTokens, sketchTokens: countTokens(contract + '\n' + reduced + '\n' + payload, ENC),
    ruleTokens: countTokens(contract, ENC), payloadTokens: countTokens(payload, ENC),
    note: exact ? 'exact inverse checked; not full parent/frontier comparison' : 'rejected: inverse mismatch' });
}

// 1) Same-row formula / EIRMOS: direct successful codec mechanism.
report('same-row-concat-template', ePlan.contract, '', names, true,
  'T = source1 + literal + source2; bounded synthesis; verify all rows');

// 2) Adjacent-row prefix delta: order-dependent chain, distinct from same-row FD.
{
  const enc: string[] = []; let prev: string[] = [];
  for (const name of names) {
    const cur = Array.from(name); let n = 0;
    while (n < cur.length && n < prev.length && cur[n] === prev[n]) n++;
    enc.push(`${n}\t${cur.slice(n).join('')}`); prev = cur;
  }
  const dec: string[] = []; prev = [];
  for (const line of enc) { const [nS, ...rest] = line.split('\t'); const cur = [...prev.slice(0, Number(nS)), ...Array.from(rest.join('\t'))]; dec.push(cur.join('')); prev = cur; }
  const contract = 'EIRMOS scout prefix-delta: first value verbatim; for each next target, copy the stated number of Unicode code points from the previous decoded target, then append the suffix after the tab. Restore the target field in original row order.';
  report('adjacent-row-prefix-delta', contract, enc.join('\n'), dec, dec.every((v, i) => v === names[i]),
    'cross-row prefix chain; order-sensitive; independent of source columns');
}

// 3) Exact dictionary + row indices. High-cardinality unique values attack amortization.
{
  const dict = [...new Set(names)]; const ix = new Map(dict.map((v, i) => [v, i]));
  const payload = 'DICT\n' + dict.map((v, i) => `${i}\t${v}`).join('\n') + '\nIDX\n' + names.map((v) => ix.get(v)).join(',');
  const dec = names.map((_, i) => dict[Number(payload.split('\nIDX\n')[1]!.split(',')[i])]!);
  const contract = 'EIRMOS scout dictionary: read the integer-indexed dictionary; each target row is the value named by its index, in source order.';
  report('value-dictionary-index', contract, payload, dec, dec.every((v, i) => v === names[i]),
    'dictionary plus index stream; expected to lose when nearly every value is unique');
}

// 4) Common affix: strip the longest common code-point prefix/suffix, carry bits.
{
  const cps = names.map((v) => Array.from(v));
  let p = 0; while (cps.every((v) => v.length > p && v[p] === cps[0]![p])) p++;
  let s = 0; while (cps.every((v) => v.length > s + p && v[v.length - 1 - s] === cps[0]![cps[0]!.length - 1 - s])) s++;
  const pref = cps[0]!.slice(0, p).join(''); const suff = s ? cps[0]!.slice(cps[0]!.length - s).join('') : '';
  const middles = cps.map((v) => v.slice(p, v.length - s).join(''));
  const dec = middles.map((v) => pref + v + suff);
  const payload = `prefix=${JSON.stringify(pref)} suffix=${JSON.stringify(suff)}\n` + middles.join('\n');
  const contract = 'EIRMOS scout affix: prepend the stated common prefix and append the stated common suffix to each middle value, preserving row order.';
  report('common-affix-strip', contract, payload, dec, dec.every((v, i) => v === names[i]),
    'one exact global common prefix/suffix; no search over row permutations');
}

// 5) Common-substring palette: replace the most frequent 2–8-codepoint token
// substring with a reserved marker only if the marker never occurs in inputs.
{
  const marker = '⟦A⟧';
  let best = '', bestCount = 0;
  for (let len = 2; len <= 8; len++) {
    const freq = new Map<string, number>();
    for (const name of names) { const a = Array.from(name); const seen = new Set<string>();
      for (let i = 0; i + len <= a.length; i++) seen.add(a.slice(i, i + len).join(''));
      for (const x of seen) freq.set(x, (freq.get(x) ?? 0) + 1);
    }
    for (const [x, n] of freq) if (n > bestCount && !x.includes(marker) && !names.some((v) => v.includes(marker))) { best = x; bestCount = n; }
  }
  const coded = names.map((v) => v.split(best).join(marker));
  const dec = coded.map((v) => v.split(marker).join(best));
  const contract = `EIRMOS scout substring palette: replace every literal ${JSON.stringify(best)} by reserved marker ${marker}; reverse all replacements before restoring the field.`;
  report('substring-palette', contract, `palette=${JSON.stringify(best)}\n` + coded.join('\n'), dec, dec.every((v, i) => v === names[i]),
    `single mined substring used by ${bestCount}/${names.length} values`);
}

// 6) Relational dimension/fact factoring is a separate table-level mechanism.
// The prior X59 exact-source receipt is imported (not re-run here) and retained
// as a negative control; this X60 fixture has 1,024 distinct targets / 1,026 rows.
result.push({ name: 'dimension-fact-normalization', mechanism: 'intern repeated entities into a dimension table and replace fact cells by IDs',
  exact: 'X59 experiment exact inverse', baseTokens: 18250, sketchTokens: 18707, delta: 457,
  note: 'measured AKOLOUTHIA-2 costs on X59 Superstore; falsified on that lane; imported receipt, not an X60 run' });

console.log(JSON.stringify({ fixture: 'bench/x60/fixtures/clients.csv', rows: names.length, distinct: new Set(names).size,
  baseTokens, eirmosPlanTokens: countTokens(ePlan.contract, ENC) + countTokens(reduced, ENC), approaches: result }, null, 1));
