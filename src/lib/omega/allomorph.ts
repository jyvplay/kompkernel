/** X134 ALLOMORPH: occurrence-conditioned aliases of an existing nonterminal.
 * Unlike bijective glyph renaming, this permits two spellings of ONE rule in
 * the same body. A new rule h=g pays for itself only where BPE context prefers h.
 * No new decoder operation: h is an ordinary backward reference in the tape.
 * Greedy bounded search; CPU-bound; no optimality or model-behaviour guarantee.
 */
import { countTokens, type EncodingName } from './bpe';
import { buildTape, wellFormed } from './euros';
import { chironDecode, chironParseTape, CHIRON_SCRIPTS, chironInScript } from './chiron';

export function allomorphFromFrontier(message: string, source: string, enc: EncodingName = 'o200k_base') {
  if (message.length > 65536) return null; // bounded experimental work, not a clock cutoff
  const at = message.indexOf('§'), end = message.indexOf('¶', at);
  if (at < 0 || end < 0) return null;
  const pre = message.slice(0, at);
  const tape = message.slice(at + 1, end);
  const script = CHIRON_SCRIPTS.find(s => tape.length && chironInScript(s, tape.codePointAt(0)!));
  // Source is NOT a decoder input. Infer the alphabet from the emitted wire.
  if (!script || !['cyrillic', 'arabic'].includes(script.name)) return null;
  const parsed = chironParseTape(tape, script);
  if (!parsed) return null;
  let rules = parsed.map(r => ({g:r.glyph,v:r.raw}));
  if (!rules.length || !wellFormed(rules)) return null;
  // Refuse ambiguous parses; the real decoder, not source-relative expansion,
  // is the authority for equivalence of the emitted program.
  if (pre + buildTape(rules) + message.slice(end) !== message) return null;
  let target: string;
  try { target = chironDecode(message.slice(at)); } catch { return null; }
  if (target === message.slice(at)) return null; // decoder passthrough is not a validity certificate
  let body = message.slice(end), best = message, tokens = countTokens(message, enc);
  let probes = 0, aliases = 0;
  const used = new Set([...source, ...message]);
  const pool: string[] = [];
  // Only the same declared script, never an undeclared vocabulary extension.
  for (let cp = script.lo; cp < script.hi; cp++) {
    const h = String.fromCodePoint(cp);
    if (!used.has(h)) pool.push(h);
  }
  for (let pass = 0; pass < 4; pass++) {
    let chosen: {message:string; body:string; h:string; g:string; tokens:number} | null = null;
    for (const r of rules) {
      const positions: number[] = [];
      for (let i = 1; i < body.length; i++) if (body[i] === r.g) positions.push(i);
      if (positions.length < 2) continue;
      for (const h of pool) {
        if (used.has(h)) continue;
        // Ranking only. The finite window is NOT asserted to be an exact BPE
        // locality theorem; every assembled message is priced and decoded.
        let b = '', last = 0, changed = 0;
        for (const pos of positions) {
          const lo = Math.max(1,pos-12), hi = Math.min(body.length,pos+13);
          const a = body.slice(lo,hi);
          const v = body.slice(lo,pos)+h+body.slice(pos+1,hi);
          if (countTokens(v,enc) < countTokens(a,enc)) {
            b += body.slice(last,pos)+h; last=pos+1; changed++;
          }
        }
        if (changed < 2) continue;
        b += body.slice(last);
        const rs = [...rules,{g:h,v:r.g}];
        const m = pre+buildTape(rs)+b;
        const n = countTokens(m,enc); probes++;
        if (n >= (chosen?.tokens ?? tokens)) continue;
        try { if (chironDecode(m.slice(at)) !== target) continue; } catch { continue; }
        chosen={message:m,body:b,h,g:r.g,tokens:n};
      }
    }
    if (!chosen) break;
    rules.push({g:chosen.h,v:chosen.g}); used.add(chosen.h);
    best=chosen.message; body=chosen.body; tokens=chosen.tokens; aliases++;
  }
  return aliases ? {message:best,tokens,aliases,probes} : null;
}
