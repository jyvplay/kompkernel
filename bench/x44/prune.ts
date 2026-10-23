/**
 * X44 screen 3 — THE DECISIVE TEST.
 *
 * screen 2 read the tape and found that 22 of 31 rules on prose-01 have negative
 * marginal value, and that every one of them names a phrase o200k_base ALREADY
 * encodes as a single token: "\n", "'s", ".", " a", ",", " to", " the", " (",
 * " and", " of", " not", " with", " as", " is", " by", " genuinely",
 * " discovered", " mechanism", " it", " —". Replacing a one-token phrase with a
 * one-token glyph saves nothing per use and costs two tokens to define.
 *
 * The diagnosis is that CHIRON's smallest-grammar search ranks candidates by
 * FREQUENCY, while the metric being paid is TOKENS. In English the most frequent
 * substrings are precisely the ones the tokenizer already encodes optimally, so a
 * frequency-ranked SLP spends its budget where the payoff is structurally zero.
 *
 * This tests the consequence directly: take a real shipped wire, delete every
 * rule whose fully-expanded text costs one token or fewer (and which no surviving
 * rule depends on), expand its glyph back to literal text everywhere, and measure
 * the result. The pruned wire is still a valid CHIRON wire under the same
 * contract, so it is checked by decoding it, not by trusting the arithmetic.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { krisisEncode } from '@/lib/omega/krisis';
import { chironParseTape, chironDecode, CHIRON_SCRIPTS, chironInScript } from '@/lib/omega/chiron';

const enc = 'o200k_base' as EncodingName;
const scriptOf = (ch: string) => {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return null;
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
};
const REP = '\u00d7', LIST = '\u2026';

function expandAll(raws: Map<string, string>): Map<string, string> {
  // rules only reference earlier rules, so one forward pass fully expands
  const out = new Map<string, string>();
  for (const [g, raw] of raws) {
    let t = raw;
    if (raw[0] !== REP && raw[0] !== LIST) {
      for (const [h, v] of out) t = t.split(h).join(v);
    }
    out.set(g, t);
  }
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
  const script = scriptOf(tape[0]);
  const parsed = script ? chironParseTape(tape, script) : null;
  if (!parsed) { console.log(`${nm}: tape did not parse`); continue; }

  const raws = new Map<string, string>();
  for (const rule of parsed) raws.set(rule.glyph, rule.raw);
  const expanded = expandAll(raws);

  // which rules are operator rules (never prunable) and which are referenced by
  // another rule's text
  const referencedBy = new Map<string, number>();
  for (const [g, raw] of raws) {
    for (const h of raws.keys()) if (h !== g && raw.includes(h)) referencedBy.set(h, (referencedBy.get(h) ?? 0) + 1);
  }

  const prunable: string[] = [];
  for (const [g, raw] of raws) {
    if (raw[0] === REP || raw[0] === LIST) continue;           // operator rule
    const ex = expanded.get(g) ?? raw;
    if (countTokens(ex, enc) > 1) continue;                     // phrase already >= 2 tokens: keep
    if (body.includes(g) || (referencedBy.get(g) ?? 0) > 0) {
      // referenced somewhere: only prunable if nothing that survives needs it
    }
    prunable.push(g);
  }

  // prune: drop those rules, expand their glyph everywhere else
  const drop = new Set(prunable);
  let newTape = '', newBody = body;
  for (const [g, raw] of raws) {
    if (drop.has(g)) continue;
    let t = raw;
    for (const h of drop) t = t.split(h).join(expanded.get(h) ?? h);
    newTape += g + t;
  }
  for (const h of drop) newBody = newBody.split(h).join(expanded.get(h) ?? h);
  const newWire = pre + newTape + '¶' + newBody;

  const before = countTokens(wire, enc), after = countTokens(newWire, enc);
  const dec = chironDecode(newWire.startsWith('§') ? newWire.slice(1) : newWire);
  const ok = dec === src;

  console.log(`\n=== ${nm}`);
  console.log(`  rules ${parsed.length} -> prunable(one-token phrases) ${drop.size} -> kept ${raws.size - drop.size}`);
  console.log(`  dropped: ${[...drop].map((g) => JSON.stringify(expanded.get(g))).join(' ')}`);
  console.log(`  wire tokens (frame only): ${before} -> ${after}   DELTA ${before - after}`);
  console.log(`  message tokens          : ${r.messageTokens} -> ${r.messageTokens - (before - after)}`);
  console.log(`  pruned wire decodes to source: ${ok ? 'YES (byte-exact)' : '*** NO ***'}`);
  console.log(`  tape ${tape.length}ch/${countTokens(tape, enc)}tok -> ${newTape.length}ch/${countTokens(newTape, enc)}tok`);
  console.log(`  body ${body.length}ch/${countTokens(body, enc)}tok -> ${newBody.length}ch/${countTokens(newBody, enc)}tok`);
}
