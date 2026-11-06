/**
 * X75 / t9 — THE KEYLINE FRONTIER.
 *
 * The experiment: replace the frontier's own decoder prose with a HEADER-DECLARED
 * keyline substitution, and pay the declaration in a header of its own.
 *
 *   message = H  \\n  body
 *   H       = "key: v=s | ..."           the same glyphs the frontier emits, shorter
 *   body    = the frontier's own body, with that sentence replaced by "k"
 *
 * Gate: the substitution is only sound if the replaced sentence is EXACTLY the one the
 * layer's own reader consumes, and the reconstructed message (H + body with "k" put
 * back) must be byte-identical to the frontier's message. That is checked here, not
 * assumed: `recon === frontier.message` is printed.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));

// candidate keylines, each a function of the sentence being replaced
const gen = (long: string) => {
  // the long clause names the script, the tape side, the delimiter, the scope, recursion, output
  const out: Array<{ name: string; k: string; v: string }> = [];
  out.push({ name: 'full-quote', k: 'k', v: long });
  out.push({ name: 'minimal', k: 'k', v: 'Before ¶ a new foreign letter names text to the next new letter. After ¶ expand repeatedly; print only.' });
  out.push({ name: 'minimal-20', k: 'k', v: 'Before ¶ each new letter names text to the next letter. After ¶ expand repeatedly; print only.' });
  return out;
};

for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackFrontier(t, enc);
  const msg: string = r.message;
  const lines = msg.split('\n');
  // the sentence to replace: the longest prose line
  let idx = -1, best = 0;
  for (const [i, l] of lines.entries()) if (l.length > best && /\.$/.test(l.trim()) && !/\d/.test(l)) { best = l.length; idx = i; }
  if (idx < 0) { console.log(`${p.split('/').pop()!.padEnd(20)} no prose contract to replace`); continue; }
  const sent = lines[idx];
  const base = T(msg, enc);
  for (const c of gen(sent)) {
    const header = `${c.k}=${c.v}`;
    const body = lines.filter((_, i) => i !== idx).join('\n');
    const pack = `${header}\n${body}`;
    // reconstruct: put the sentence back where the keyline says
    const recon = (() => { const ls = msg.split('\n'); const o = [...ls]; o[idx] = c.v; return o.join('\n'); })();
    const exact = recon === msg;
    const tok = T(pack, enc);
    console.log(`${p.split('/').pop()!.padEnd(20)} ${c.name.padEnd(11)} frontier ${String(base).padStart(5)} -> ${String(tok).padStart(5)} (d ${String(tok - base).padStart(4)}) reconExact ${exact} | sent ${T(sent, enc)} hdr ${T(header, enc)}`);
  }
}
