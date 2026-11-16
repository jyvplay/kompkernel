/**
 * X121 — does a deletion sweep priced by the OPTIMAL global parse beat
 * ΔΙΑΓΡΑΦΗ's literal write-back?
 *
 * ΔΙΑΓΡΑΦΗ deletes rule i by writing value(i) back LITERALLY into every user and
 * re-pricing. ΒΕΛΤΙΣΤΟΣ (which runs AFTER it) then re-parses the whole body as an
 * optimal interleaving of literal characters and rule glyphs. So the deletion is
 * priced against a spelling the pipeline never keeps. This probe prices it the
 * way the pipeline actually ends up: delete, then re-parse globally.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode } from '../../src/lib/omega/chiron';
import { veltistosEncode } from '../../src/lib/omega/veltistos';

const enc = 'o200k_base' as const;
const want = (process.argv[2] ?? 'node-help').split(',');
const LIMIT = Number(process.argv[3] ?? 999);
const rows = fs.readFileSync('bench/x120/receipts/ab-messages.jsonl', 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));

for (const r of rows) {
  if (!want.some((w) => r.path.includes(w))) continue;
  const m0: string = r.message;
  const w = m0.indexOf(CHIRON_START), cut = m0.indexOf(CHIRON_SEP, w + 1);
  const prefix = m0.slice(0, w), tape0 = m0.slice(w + 1, cut), body0 = m0.slice(cut + 1);
  const script = CHIRON_SCRIPTS.find(s => chironInScript(s, tape0.codePointAt(0)!))!;
  const parsed0 = chironParseTape(tape0, script)!;
  const base = countTokens(m0, enc);
  const ref = chironDecode(m0.slice(w));
  console.log(`### ${r.path} base=${base} rules=${parsed0.length}`);

  const results: Array<{ i: number; g: string; vlen: number; lit: number; reparsed: number }> = [];
  for (let i = 0; i < parsed0.length; i++) {
    const g = parsed0[i]!.glyph;
    // expand rule g fully, drop it, write the expansion back literally everywhere
    let exp: string;
    try { exp = chironDecode(CHIRON_START + tape0 + CHIRON_SEP + g); } catch { continue; }
    if (!exp || exp.startsWith(CHIRON_START)) continue;
    const dropOne = (s: string) => s.split(g).join(exp);
    const tape1 = parsed0.filter((_, k) => k !== i)
      .map(({ glyph, raw }) => glyph + dropOne(raw)).join('');
    const body1 = dropOne(body0);
    const msg1 = prefix + CHIRON_START + tape1 + CHIRON_SEP + body1;
    let ok = false;
    try { ok = chironDecode(msg1.slice(msg1.indexOf(CHIRON_START))) === ref; } catch { ok = false; }
    if (!ok) continue;
    const litTok = countTokens(msg1, enc);
    const rp = veltistosEncode(r.path, enc, { message: msg1, messageTokens: litTok, decoded: ref });
    results.push({ i, g, vlen: exp.length, lit: litTok, reparsed: rp.messageTokens });
  }
  results.sort((a, b) => (a.reparsed - a.lit) - (b.reparsed - b.lit));
  let sum = 0;
  for (const x of results.slice(0, LIMIT)) {
    const d = x.reparsed - base;
    if (d < 0) sum += -d;
    console.log(`  rule ${String(x.i).padStart(3)} ${x.g} |v|=${String(x.vlen).padStart(4)} literalWriteBack=${String(x.lit - base).padStart(4)} afterReparse=${String(d).padStart(4)}`);
  }
  console.log(`  >>> sum of negative deltas (upper bound if all compatible): ${sum}`);
}
