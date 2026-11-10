/**
 * X100 — ΑΝΤΑΝΑΚΛΑΣΙΣ (antanaklasis, "reflection"): REFLECT THE TAPE'S RE-SPELLED KEY-SEQUENCES
 *        BACK INTO THE BODY, AT ZERO COST.
 *
 * THE GAP, STATED AS A SEQUENCING FACT NO CODEC IN THE STACK HAS TOUCHED.
 *
 * CHIRON's macro pass mines token-aligned spans over the SOURCE text and the body, and then the
 * body is finalised: every admitted span becomes a single reference letter.  ΣΥΝΔΥΑΣΜΟΣ (X99) then
 * RE-SPELLS the tape's values, so that a value becomes an interleaving of literal runs and
 * references to earlier rules.  Some of those re-spellings come out PURE: the value is nothing but a
 * run of key letters, e.g. v_r = k_a k_b.
 *
 * Nothing ever goes back and asks the body whether it contains k_a k_b.  If it does, that body run
 * is already spelled by rule r, and replacing it with k_r is
 *
 *     cost    = 0            -- no new rule, no contract clause, no tape change
 *     saving  = (L - 1) tokens per occurrence, where L = |v_r|
 *
 * and it is legal because the decoder expands references REPEATEDLY: expanding k_r yields
 * value(r) = k_a k_b, which expands to value(a) value(b) -- byte-identical to what the body said.
 *
 * WHY THE INCUMBENT CANNOT HAVE FOUND IT.  The macro pass priced the span against the rule set that
 * existed when it ran.  A rule whose value is exactly k_a k_b did not exist then, and even if it
 * had, the pass's candidate was the SOURCE span, not the post-substitution body run.  This is a
 * genuinely new interface: it is not ADD (no rule is added), not FACTOR (no value is re-spelled),
 * not ΜΕΤΑΤΑΞΙΣ (no slot moves), not ἸΣΟΜΟΡΦΪΑ (no letter is reassigned).
 *
 * The replacement is applied to a FIXPOINT, because reflecting one run can expose another.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { syndyasmosEncode } from '../../src/lib/omega/syndyasmos';

const enc: any = 'o200k_base';
interface Wire { contract: string; keys: string[]; values: string[]; body: string }
function parse(msg: string): Wire {
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const tape = msg.slice(w + 1, t);
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>(); let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') { keys.push(ck); values.push(cv); } seen.add(ch); ck = ch; cv = ''; }
    else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { contract: msg.slice(0, w), keys, values, body: msg.slice(t + 1) };
}
const emit = (wr: Wire): string => wr.contract + CHIRON_START + wr.keys.map((k, i) => k + wr.values[i]).join('') + CHIRON_SEP + wr.body;

const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41','bench/holdout','bench/holdout-work','bench/holdout-x42','bench/holdout-x42b','bench/holdout-tbl','bench/holdout-x40','bench/holdout-ops','bench/holdout-lang','bench/holdout-mk','bench/holdout-x86','bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const p = `${d}/${lane}${e}`; if (fs.existsSync(p)) return p; }
  }
  throw new Error('no source for ' + lane);
};

const rows: any[] = [];
let gCommitted = 0, gSynd = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const lane = f.replace('.wire.txt', '');
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const t0 = countTokens(msg, enc);
  const S: any = syndyasmosEncode(text, enc, { message: msg, messageTokens: t0, decoded: text });
  const out: any = { lane: f, committed: t0, synd: S.messageTokens };

  for (const [tag, wire] of [['committed', msg], ['synd', S.message]] as Array<[string, string]>) {
    let wr = parse(wire);
    const base = countTokens(wire, enc);
    let applied = 0, rounds = 0;
    for (;;) {
      const keyset = new Set(wr.keys);
      // map: pure key-sequence value (length >= 2) -> its key.  Longest first.
      const seqs = new Map<string, string>();
      for (let i = 0; i < wr.keys.length; i++) {
        const v = wr.values[i];
        if (v.length >= 2 && [...v].every(c => keyset.has(c))) if (!seqs.has(v)) seqs.set(v, wr.keys[i]);
      }
      const order = [...seqs.keys()].sort((a, b) => b.length - a.length);
      let body = wr.body, changed = 0;
      for (const v of order) {
        const k = seqs.get(v)!;
        // replace only where it actually reduces the token count: L tokens -> 1
        let guard = 0;
        while (body.includes(v) && guard++ < 400) { body = body.replace(v, k); changed++; }
      }
      if (!changed) break;
      wr = { ...wr, body };
      rounds++;
      applied += changed;
    }
    const after = countTokens(emit(wr), enc);
    const ok = chironDecode(emit(wr).slice(emit(wr).indexOf(CHIRON_START))) === text;
    out[tag + 'Delta'] = after - base;
    out[tag + 'Exact'] = ok;
    out[tag + 'Applied'] = applied;
    if (tag === 'committed') gCommitted += after - base; else gSynd += after - base;
  }
  rows.push(out);
  console.log(`${f.padEnd(20)} committed ${t0}->${String(t0 + out.committedDelta).padStart(5)} (${String(out.committedDelta).padStart(3)}, ${out.committedApplied} refl, exact=${out.committedExact})   synd ${S.messageTokens}->${String(S.messageTokens + out.syndDelta).padStart(5)} (${String(out.syndDelta).padStart(3)}, ${out.syndApplied} refl, exact=${out.syndExact})`);
}
console.log(`\nΑΝΤΑΝΑΚΛΑΣΙΣ: pooled Δ on committed wires = ${gCommitted}; on ΣΥΝΔΥΑΣΜΟΣ wires = ${gSynd}`);
fs.writeFileSync('bench/x100/receipts/antanaklasis.json', JSON.stringify({ rows, gCommitted, gSynd }, null, 1));
