/**
 * src/lib/omega/veritas-p.ts
 * =============================================================================
 * VERITAS-P — VERITAS-A with a deterministic PRUNE pass (exact, byte-perfect).
 *
 * The greedy in veritas-a keeps an entry once accepted and never revisits it. The prune pass tries,
 * for each entry in order, to REMOVE it (restore its phrase at every alias occurrence), and keeps the
 * removal only if the real token count of the wire falls. The wire format is unchanged, so the
 * VERITAS-A decoder decodes the output. The pass is a single deterministic sweep (no search).
 * =============================================================================
 */
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { escBody, escHeader, veritasADecode, VXA_LEGEND_V2, VXA_SENTINEL, veritasAEncode, type VxaEntry, type VxaResult } from '@/lib/omega/veritas-a';

function wireOf(entries: VxaEntry[], body: string, legend: string): string {
  if (entries.length === 0) return body;
  return VXA_SENTINEL + legend + '\n' + entries.map((e) => e.key + '=' + escHeader(e.phrase)).join('\n') + '\n' + ']]' + '\n' + body;
}

export function veritasAPrune(text: string, enc: EncodingName, W: number, legend: string = VXA_LEGEND_V2): VxaResult {
  const base = veritasAEncode(text, enc, W, legend);
  if (base.mode !== 'dict' || base.entries.length === 0) return base;
  const bodyStart = base.wire.indexOf('\n]]\n') + 4;
  let body = base.wire.slice(bodyStart);
  let entries = [...base.entries];
  let cur = countTokens(base.wire, enc);
  for (const e of [...base.entries]) {
    const restored = body.split(e.key).join(escBody(e.phrase));
    const without = entries.filter((x) => x.key !== e.key);
    const candTok = countTokens(wireOf(without, restored, legend), enc);
    if (candTok < cur) { cur = candTok; body = restored; entries = without; }
  }
  const wire = wireOf(entries, body, legend);
  const decoded = veritasADecode(wire);
  if (decoded !== text) return base; // never emit a wire that does not decode
  return { wire, decoded, exact: true, mode: entries.length ? 'dict' : 'identity', entries, inTokens: base.inTokens, outTokens: countTokens(wire, enc) };
}
