/** X115 screen 5: affix closure of the existing CHIRON macro language.
 * A rule glyph already expands anywhere in the body. If the body still contains
 * value(rule)+affix or affix+value(rule) literally, replacing that span by
 * glyph+affix or affix+glyph needs NO new contract clause. Prices the complete
 * message and verifies chironDecode equality. Screen only; no encoder calls. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const src = process.argv[2] ?? 'bench/x115/receipts/frontier.jsonl';
const AFF = ['', 's', 'es', 'ed', 'ing', 'd', 'ly', 'er', 'est', 'tion', 'ion', 'ment', 'ness', 'less', 'ful', 'al', 'ive', 'ity', 'able', 'ible', 'ize', 'ized', 'izing', 'ization', 'or', 'ors', 'ary', 'ure', 're', 'un', 'pre', 'post', 'non', 'sub', 'inter', 'over', 'under', 'anti', 'multi', 'semi', 'auto', 'de', 'dis', 'en', 'em', 'in', 'im', 'il', 'ir', 'mis', 'out', 'up', 'down', 'back', 'forward', 'side', 'wise', 'like', 'ship', 'hood', 'dom', 'ism', 'ist', 'ic', 'ical', 'ish', 'ous', 'ent', 'ant', 'ance', 'ence', 'cy', 'ty', 'age', 'ery', 'ry', 'fy', 'ify', 'efy', 'ate', 'ated', 'ating', 'ation', 'ator', 'ators', 'ee', 'eer', 'ese', 'ette', 'let', 'ling', 'ock', 'ule', 'cle', 'ule', 'cule', 'ule.', 's.', 'ed.', 'ing.', 'ly.', 'er.', 'est.', 'tion.', 'ion.', 'ment.', 'ness.', 'less.', 'ful.', 'al.', 'ive.', 'ity.', 'able.', 'ible.'];
const rows: any[] = [];
for (const line of fs.readFileSync(src, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line);
  const m: string = r.message;
  const start = m.indexOf(CHIRON_START);
  if (start < 0) { rows.push({ path: r.path, tokens: r.tokens, note: 'no frame' }); continue; }
  const cut = m.indexOf(CHIRON_SEP, start + 1);
  if (cut < 0) { rows.push({ path: r.path, tokens: r.tokens, note: 'no sep' }); continue; }
  const tape = m.slice(start + 1, cut);
  const body = m.slice(cut + 1);
  const first = tape[0];
  const script = CHIRON_SCRIPTS.find(s => first && chironInScript(s, first.codePointAt(0)!));
  if (!script) { rows.push({ path: r.path, tokens: r.tokens, note: 'no script' }); continue; }
  const parsed = chironParseTape(tape, script);
  if (!parsed) { rows.push({ path: r.path, tokens: r.tokens, note: 'bad tape' }); continue; }
  const incExp = chironDecode(m.slice(start));
  const vals: Array<{ g: string; v: string }> = [];
  for (const p of parsed) {
    let v: string;
    try { v = chironDecode(CHIRON_START + tape + CHIRON_SEP + p.glyph); } catch { continue; }
    if (v === p.glyph || v.length < 3 || v.length > 80) continue;
    if ([...v].some(ch => chironInScript(script, ch.codePointAt(0)!))) continue;
    vals.push({ g: p.glyph, v });
  }
  vals.sort((a, b) => b.v.length - a.v.length);
  let best: any = null;
  let candidates = 0;
  for (const { g, v } of vals) {
    for (const aff of AFF) {
      for (const dir of ['suffix', 'prefix'] as const) {
        const span = dir === 'suffix' ? v + aff : aff + v;
        const repl = dir === 'suffix' ? g + aff : aff + g;
        if (span === repl || !body.includes(span)) continue;
        candidates++;
        const newBody = body.split(span).join(repl);
        const wire = CHIRON_START + tape + CHIRON_SEP + newBody;
        const cand = m.slice(0, start) + wire;
        const tok = T(cand);
        let exact = false;
        try { exact = chironDecode(wire) === incExp; } catch { exact = false; }
        if (exact && tok < r.tokens && (!best || tok < best.tokens)) best = { g, v, aff, dir, tokens: tok, delta: tok - r.tokens, exact, n: body.split(span).length - 1 };
      }
    }
  }
  rows.push({ path: r.path, tokens: r.tokens, rules: vals.length, candidates, best });
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${r.tokens} rules=${vals.length} cand=${candidates} best=${best ? `${best.tokens} (${best.delta}) ${best.dir} ${JSON.stringify(best.v)}+${JSON.stringify(best.aff)} n=${best.n}` : 'none'}`);
}
const wins = rows.filter(r => r.best);
const totalBase = rows.reduce((a, r) => a + r.tokens, 0);
const totalBest = rows.reduce((a, r) => a + (r.best ? r.best.tokens : r.tokens), 0);
console.log(`TOTAL base ${totalBase} best ${totalBest} delta ${totalBest - totalBase} wins ${wins.length}/${rows.length}`);
fs.mkdirSync('bench/x115/receipts', { recursive: true });
fs.writeFileSync('bench/x115/receipts/screen5.json', JSON.stringify({ schema: 'kompkernel-x115-screen5-v1', note: 'affix closure of existing CHIRON rules on baseline messages; no encoder calls', totals: { base: totalBase, best: totalBest, delta: totalBest - totalBase, wins: wins.length }, rows }, null, 2) + '\n');
