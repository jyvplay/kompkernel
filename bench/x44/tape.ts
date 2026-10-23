/**
 * X44 screen 2 — READ THE ACTUAL WIRE.
 *
 * screen 1 priced the parts; this looks at them. The question it exists to
 * answer is whether the dictionary substitutes on WORD boundaries or inside
 * words, because a substitution inside an English word shatters a token that
 * o200k_base would otherwise emit whole: "information" is one token, but
 * "in" + <glyph> + "ation" is three, and the two surviving fragments are each
 * worse than the word they came from.
 *
 * For every rule it reports: the phrase, how many times it is referenced in the
 * body, whether its occurrences in the source are word-aligned, and its marginal
 * token economics -- what the definition costs in the tape against what the
 * references save in the body.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { krisisEncode } from '@/lib/omega/krisis';
import { chironParseTape, CHIRON_SCRIPTS, chironInScript } from '@/lib/omega/chiron';

const scriptOf = (ch: string) => {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return null;
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
};

const enc = 'o200k_base' as EncodingName;

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const src = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const r: any = krisisEncode(src, enc);
  const wire: string = r.wire;
  const i = wire.indexOf('§');
  const frame = i >= 0 ? wire.slice(i + 1) : wire;
  const sep = frame.indexOf('¶');
  if (sep < 0) { console.log(`${nm}: no tape`); continue; }
  const tape = frame.slice(0, sep);
  const body = frame.slice(sep + 1);

  const script = scriptOf(tape[0]);
  console.log(`\n=== ${nm}   script=${script ? script.name : '?'}   tape ${tape.length}ch/${countTokens(tape, enc)}tok   body ${body.length}ch/${countTokens(body, enc)}tok`);
  console.log(`TAPE (verbatim, first 500):\n${JSON.stringify(tape.slice(0, 500))}`);
  console.log(`BODY (verbatim, first 500):\n${JSON.stringify(body.slice(0, 500))}`);

  const parsed = script ? chironParseTape(tape, script) : null;
  if (!parsed) { console.log('  (tape did not parse)'); continue; }
  const inScript = (ch: string) => script ? chironInScript(script, ch.codePointAt(0)!) : false;

  console.log(`  rules parsed: ${parsed.length}`);
  console.log('  letter | uses | phraseLen | phraseTok | aligned | defnCost | refCost | marginal');
  let totDefn = 0, totRef = 0, neg = 0, nonAligned = 0;
  for (const rule of parsed) {
    const letter = rule.glyph;
    const text: string = rule.raw;
    const uses = [...body].filter((c) => c === letter).length;
    // how does this phrase appear in the source?
    let occ = 0, aligned = 0;
    if (text.length) {
      let at = src.indexOf(text);
      while (at >= 0) {
        occ++;
        const before = at === 0 ? ' ' : src[at - 1];
        const after = at + text.length >= src.length ? ' ' : src[at + text.length];
        if (!/[A-Za-z0-9]/.test(before) && !/[A-Za-z0-9]/.test(after)) aligned++;
        at = src.indexOf(text, at + 1);
      }
    }
    const phraseTok = text.length ? countTokens(text, enc) : 0;
    const defnCost = countTokens(letter + text, enc);           // tape cost of this rule
    const refCost = uses * countTokens(letter, enc);            // body cost of the references
    // marginal: what we pay (definition + references) vs what the literal text would have cost
    const literalCost = uses * phraseTok;
    const marginal = literalCost - defnCost - refCost;
    totDefn += defnCost; totRef += refCost;
    if (marginal < 0) neg++;
    if (occ > 0 && aligned < occ) nonAligned++;
    console.log(`  ${JSON.stringify(letter).padEnd(7)}| ${String(uses).padStart(4)} | ${String(text.length).padStart(9)} | ${String(phraseTok).padStart(9)} | ${String(aligned + '/' + occ).padStart(7)} | ${String(defnCost).padStart(8)} | ${String(refCost).padStart(7)} | ${String(marginal).padStart(8)}  ${JSON.stringify(text.slice(0, 40))}`);
  }
  console.log(`  TOTALS: definition ${totDefn} tok + references ${totRef} tok; ${neg}/${parsed.length} rules have NEGATIVE marginal; ${nonAligned}/${parsed.length} rules occur inside words`);
}
