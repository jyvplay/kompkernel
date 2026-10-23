/**
 * X42 screen 6 — anatomy of the prose lanes, all twelve of them.
 * Ten of these have never moved in X33..X41. Question: is the payload already
 * dense, or is the instruction overhead the thing that eats the gain?
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';
import { apocopeEncode, apocopeDecode } from '@/lib/omega/apocope';
import { chironDecode } from '@/lib/omega/chiron';

const enc: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = apocopeEncode(t, enc);
  const back = apocopeDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  } as any, {
    alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup,
    framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode,
    ouraSentinel: r.ouraSentinel, antistrophePair: r.antistrophePair,
    peritropePairs: r.peritropePairs, systoleTemplates: r.systoleTemplates,
    apocopeTemplates: r.apocopeTemplates,
  } as any);
  const msg: string = r.contract ? r.contract + '\n' + r.wire : r.wire;
  // instruction = everything up to the payload marker, payload = the rest
  const idx = r.contract ? r.contract.length + 1 : 0;
  const instr = msg.slice(0, idx), payload = msg.slice(idx);
  const iT = encode(instr).length, pT = encode(payload).length;
  let dchars = 0, druns = 0, floor = 0;
  for (const m of payload.matchAll(/\p{N}+/gu)) { dchars += m[0].length; druns++; floor += Math.ceil(m[0].length / 3); }
  const ok = back === t ? 'EXACT' : '***MISMATCH***';
  console.log(
    p.split('/').pop()!.padEnd(16),
    'src=' + String(encode(t).length).padStart(5),
    'msg=' + String(r.messageTokens).padStart(5),
    'instr=' + String(iT).padStart(4),
    'pay=' + String(pT).padStart(5),
    '[' + (payload.length / Math.max(pT, 1)).toFixed(2) + 'c/tk]',
    'dig=' + String(dchars).padStart(4) + '/' + String(floor).padStart(3) + 'tok',
    'glyphs=' + r.alphabet,
    ok, ((Date.now() - t0) / 1000).toFixed(1) + 's',
  );
  if (process.env.DUMP) writeFileSync(`/tmp/x42-${p.split('/').pop()}.txt`, msg);
}
