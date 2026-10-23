/**
 * X44 screen 4 — DOES THE CHOICE OF GLYPH SCRIPT MATTER, AND IS THE CURRENT
 * CHOICE THE CHEAPEST?
 *
 * screen 3 tried to prune the rules that looked worthless and made every lane
 * WORSE by 19-36 tokens. The reason is the finding of this turn: 150 rule
 * references cost only ~90 tokens in situ, about 0.6 tokens each against the 1.0
 * the literal phrase would cost, because ADJACENT GLYPHS MERGE. The body of
 * prose-01 contains runs like "كي" and "ارس" that price as one or two tokens
 * rather than two or three.
 *
 * So the wire's cost is dominated by how well the rule alphabet merges with
 * ITSELF, not by which phrases are in the dictionary. And chiron.ts:1344 picks
 * that alphabet once, by MINIMUM COLLISION COUNT against the payload, never by
 * measured cost, and reuses it for the whole variant sweep. X43 confirmed the
 * mechanism; X42's Floor 2 argument against changing it was wrong, because
 * chiron.ts:144 says the first tape letter declares the script so the alphabet is
 * free. X43 then tested remapping on aapl by frequency rank and got worse -- but
 * that test DESTROYED the adjacency structure by reordering, which is exactly the
 * thing that turns out to matter.
 *
 * This test preserves adjacency: it applies a consistent bijection from the rules
 * in use onto each candidate script's pool, in tape order, so the glyph SEQUENCE
 * is unchanged and only the script differs. Every candidate is then decoded to
 * prove it is still a valid wire.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { krisisEncode } from '@/lib/omega/krisis';
import { chironParseTape, chironDecode, CHIRON_SCRIPTS, chironInScript, type ChironScript } from '@/lib/omega/chiron';

const enc = 'o200k_base' as EncodingName;
const scriptOf = (ch: string) => {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return null;
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
};

const poolCache = new Map<string, string[]>();
function poolOf(s: ChironScript): string[] {
  const hit = poolCache.get(s.name);
  if (hit) return hit;
  const out: string[] = [];
  const spans = s.ranges ?? [[s.lo, s.hi] as [number, number]];
  for (const [a, b] of spans) {
    for (let cp = a; cp < b; cp++) {
      const ch = String.fromCodePoint(cp);
      if (countTokens(ch, enc) === 1) out.push(ch);
    }
  }
  poolCache.set(s.name, out);
  return out;
}

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const src = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const r: any = krisisEncode(src, enc);
  const wire: string = r.wire;
  const i = wire.indexOf('§');
  const pre = i >= 0 ? wire.slice(0, i + 1) : '';
  const frame = i >= 0 ? wire.slice(i + 1) : wire;
  const sep = frame.indexOf('¶');
  if (sep < 0) { console.log(`${nm}: no tape`); continue; }
  const tape = frame.slice(0, sep), body = frame.slice(sep + 1);
  const cur = scriptOf(tape[0]);
  const parsed = cur ? chironParseTape(tape, cur) : null;
  if (!parsed) { console.log(`${nm}: tape did not parse`); continue; }

  // adjacency structure of the current wire, for comparison
  let adj = 0, runs = 0;
  const inCur = (c: string) => cur ? chironInScript(cur, c.codePointAt(0)!) : false;
  for (let k = 1; k < body.length; k++) if (inCur(body[k]) && inCur(body[k - 1])) adj++;
  for (let k = 0; k < body.length; k++) if (inCur(body[k]) && (k === 0 || !inCur(body[k - 1]))) runs++;
  const glyphCount = [...body].filter(inCur).length;

  const baseFrame = countTokens(frame, enc);
  console.log(`\n=== ${nm}   current script=${cur!.name}   rules=${parsed.length}  glyph refs=${glyphCount}  adjacent pairs=${adj}  runs=${runs}  frame=${baseFrame} tok`);
  console.log(`    ${(glyphCount / Math.max(runs, 1)).toFixed(2)} glyphs per run; frame cost per glyph ref = ${(baseFrame / glyphCount).toFixed(3)}`);

  const glyphs = parsed.map((x) => x.glyph);
  const literalChars = new Set([...body].filter((c) => !inCur(c)));

  const rows: Array<[string, number, string, number]> = [];
  for (const s of CHIRON_SCRIPTS) {
    const pool = poolOf(s).filter((g) => !literalChars.has(g));
    if (pool.length < glyphs.length) { rows.push([s.name, NaN, `pool ${pool.length} < ${glyphs.length}`, 0]); continue; }
    const map = new Map<string, string>();
    for (let k = 0; k < glyphs.length; k++) map.set(glyphs[k], pool[k]);
    const newTape = [...tape].map((c) => map.get(c) ?? c).join('');
    const newBody = [...body].map((c) => map.get(c) ?? c).join('');
    const newFrame = '§' + newTape + '¶' + newBody;
    const tk = countTokens(newFrame, enc);
    let ok = '?';
    try { ok = chironDecode(newFrame.slice(1)) === src ? 'EXACT' : 'FAIL'; } catch { ok = 'THREW'; }
    rows.push([s.name, tk, ok, pool.length]);
  }
  rows.sort((a, b) => (isNaN(a[1]) ? 1 : isNaN(b[1]) ? -1 : a[1] - b[1]));
  for (const [name, tk, ok, pl] of rows) {
    const d = isNaN(tk) ? '' : `  delta ${baseFrame - tk >= 0 ? '+' : ''}${baseFrame - tk}`;
    console.log(`    ${name.padEnd(10)} ${isNaN(tk) ? '   --  ' : String(tk).padStart(6)}  pool=${String(pl).padStart(4)}  ${ok}${d}${name === cur!.name ? '   <== CURRENT' : ''}`);
  }
}
