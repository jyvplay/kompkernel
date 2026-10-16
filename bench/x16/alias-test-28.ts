// X16 (copy of bench/z58/alias-test.ts, same logic) on all 28 lanes, adding the plain DAEDALUS baseline in-process.
// X13: the user's language-tier idea, end-to-end. Words >=2 o200k tokens are replaced by a
// single-token alias taken from another language; the alias table goes in the contract; DAEDALUS runs
// on the substituted text. M = countTokens(contract + DAEDALUS decoderPrompt). Gate: exact inverse.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
// Short common words from several languages. Only those that are ONE o200k token (with a leading space) are used.
const POOL = ('de die und le la les el los di che em na ist het een og och til jest ve bir dan yang nie sie ja nein si non est et ' +
  'ad in cum per ab aut sed tem der das ein ich du er es wir ihr uns mit von zu auf aus ist os as um uma com por para que do da ' +
  'dos das el al un una ce sur pour dans avec entre sans sous chez alle nel della degli sul per ma se bei auf oder aber also kein ' +
  'aan ook maar nog wel niet hij zij ze wat hoe waar wie qui quod ut ex sub ante post inter contra ergo nam enim').split(' ');
const seen = new Set<string>();
const pool = POOL.filter(a => { if (seen.has(a)) return false; seen.add(a); return countTokens(' ' + a, 'o200k_base') === 1; });

function aliasPlan(text: string) {
  const words = text.match(/\p{L}{4,}/gu) ?? [];
  const cnt = new Map<string, number>();
  for (const w of words) cnt.set(w, (cnt.get(w) ?? 0) + 1);
  const lower = new Set(words.map(w => w.toLowerCase()));
  const cands: { w: string; occ: number; gain: number }[] = [];
  for (const [w, occ] of cnt) {
    if (occ < 2) continue;
    const tw = countTokens(' ' + w, 'o200k_base');
    if (tw < 2) continue;
    cands.push({ w, occ, gain: occ * (tw - 1) });
  }
  cands.sort((a, b) => b.gain - a.gain);
  const table: [string, string][] = [];
  const used = new Set<string>();
  let ai = 0;
  for (const c of cands) {
    if (ai >= pool.length) break;
    let alias = '';
    while (ai < pool.length) { const a = pool[ai++]; if (!lower.has(a) && !used.has(a) && !text.includes(a)) { alias = a; break; } }
    if (!alias) break;
    const entryCost = countTokens(' ' + c.w, 'o200k_base') + countTokens(' ' + alias, 'o200k_base') + 2;
    const net = c.occ * (countTokens(' ' + c.w, 'o200k_base') - 1) - entryCost;
    if (net <= 0) continue;
    used.add(alias);
    table.push([alias, c.w]);
  }
  return table;
}

function apply(text: string, table: [string, string][]): string {
  let out = text;
  for (const [alias, w] of table) out = out.replace(new RegExp(`(?<![\\p{L}])${w}(?![\\p{L}])`, 'gu'), alias);
  return out;
}
function unapply(text: string, table: [string, string][]): string {
  let out = text;
  for (const [alias, w] of table) out = out.replace(new RegExp(`(?<![\\p{L}])${alias}(?![\\p{L}])`, 'gu'), w);
  return out;
}

for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const table = aliasPlan(text);
  const sub = apply(text, table);
  const back = unapply(sub, table);
  const contract = 'Aliases (replace each alias with its word): ' + table.map(([a, w]) => `${a}=${w}`).join(', ') + '.';
  const d = daedalusEncode(sub, 'o200k_base');
  const M = countTokens(contract + '\n' + d.decoderPrompt, 'o200k_base');
  const base = daedalusEncode(text, 'o200k_base');
  console.log(JSON.stringify({ lane: f.split('/').pop(), baselineM: base.messageTokens, entries: table.length, contractTokens: countTokens(contract, 'o200k_base'),
    exact: back === text && d.exact && daedalusDecode(d.wire) === sub, daedalusOnAliasText: d.messageTokens, aliasM: M, pool: pool.length }));
}
