/**
 * ✧ ATLAS-A1 — Contract-Aware Meta-Partition (MOSAIC ⊕ delivered objective)
 *
 * Scores exact candidates by delivered tokens = wire tokens + decoder contract
 * tokens. Emits the winning member wire verbatim; no wrapper and no framing tax.
 */
import { countTokens, type EncodingName } from './bpe';
import { mosaicEncode, mosaicDecode, mosaicDecoderPrompt } from './mosaic';
import { lumenEncode, lumenDecode, LUMEN_SYSTEM_PROMPT } from './lumen';
import { praxisEncode, praxisDecode, PRAXIS_SYSTEM_PROMPT } from './praxis';

export interface AtlasResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  contractTokens: number;
  deliveredTokens: number;
  deliveredVsRaw: number;
  member: 'identity' | 'mosaic' | 'lumen' | 'praxis';
  contractPrompt: string;
  notes: string;
  encodeMs: number;
}

interface Member {
  name: AtlasResult['member'];
  wire: string;
  decoded: string;
  contract: string;
}

export function atlasDecode(wire: string): string {
  if (wire.startsWith('[MZ1]\n')) return mosaicDecode(wire);
  if (wire.startsWith('KEY ')) return lumenDecode(wire);
  if (wire.startsWith('[PX2]\n')) return praxisDecode(wire);
  // MOSAIC's zero-overhead degeneracy emits the selected member wire bare
  // ([SG1], [AN1], [P1], HELIX, or literal). The canonical ATLAS gate must
  // therefore dispatch through mosaicDecode here or it silently rejects the
  // MOSAIC member on homogeneous inputs.
  return mosaicDecode(wire);
}

export function atlasEncode(text: string, enc: EncodingName = 'o200k_base'): AtlasResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): AtlasResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    contractTokens: 0,
    deliveredTokens: inTokens,
    deliveredVsRaw: 0,
    member: 'identity',
    contractPrompt: '',
    notes,
    encodeMs: ms(),
  });
  if (!text) return identity('empty input');

  const members: Member[] = [{ name: 'identity', wire: text, decoded: text, contract: '' }];
  try {
    const m = mosaicEncode(text, enc);
    const contract = mosaicDecoderPrompt(m);
    members.push({
      name: 'mosaic',
      wire: m.wire,
      decoded: m.decoded,
      contract,
    });
  } catch {
    /* member unavailable */
  }
  try {
    const l = lumenEncode(text, enc);
    members.push({ name: 'lumen', wire: l.wire, decoded: l.decoded, contract: LUMEN_SYSTEM_PROMPT });
  } catch {
    /* member unavailable */
  }
  try {
    const p = praxisEncode(text, enc);
    members.push({ name: 'praxis', wire: p.wire, decoded: p.decoded, contract: PRAXIS_SYSTEM_PROMPT });
  } catch {
    /* member unavailable */
  }

  let best: Member | null = null;
  let bestDelivered = Number.POSITIVE_INFINITY;
  let bestWireTok = Number.POSITIVE_INFINITY;
  for (const m of members) {
    if (atlasDecode(m.wire) !== text) continue;
    const wireTok = countTokens(m.wire, enc);
    const delivered = wireTok + countTokens(m.contract, enc);
    if (delivered < bestDelivered || (delivered === bestDelivered && wireTok < bestWireTok)) {
      best = m;
      bestDelivered = delivered;
      bestWireTok = wireTok;
    }
  }

  if (!best || best.name === 'identity') {
    return identity('identity delivers fewest tokens once the contract is counted');
  }
  const outTokens = countTokens(best.wire, enc);
  if (outTokens >= inTokens) return identity('gate G2: winner wire not smaller than input');
  const decoded = atlasDecode(best.wire);
  if (decoded !== text) return identity('gate G1: winner failed byte-verify');
  const contractTokens = countTokens(best.contract, enc);
  const deliveredTokens = outTokens + contractTokens;
  return {
    wire: best.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    contractTokens,
    deliveredTokens,
    deliveredVsRaw: inTokens - deliveredTokens,
    member: best.name,
    contractPrompt: best.contract,
    notes:
      `ATLAS: winner=${best.name} · wire ${inTokens}→${outTokens} · ` +
      `contract ${contractTokens} · delivered ${deliveredTokens} ` +
      `(${inTokens - deliveredTokens >= 0 ? '+' : ''}${inTokens - deliveredTokens} vs raw) · byte-exact`,
    encodeMs: ms(),
  };
}

export const ATLAS_SYSTEM_PROMPT = [
  '# ✧ ATLAS-A1 — byte-exact; winner minimises delivered tokens (wire + contract)',
  'Read the wire by its leading header:',
  '  [MZ1] → MOSAIC partitioned wire',
  '  KEY   → LUMEN legend (character = phrase; expand bottom-to-top)',
  '  [PX2] → PRAXIS dictionary (alias = phrase; expand bottom-to-top)',
  '  none  → literal text.',
  'Reconstruction is exact; nothing was summarised or dropped.',
].join('\n');

export function atlasDecoderPrompt(r?: AtlasResult | null): string {
  if (!r) return ATLAS_SYSTEM_PROMPT;
  return r.contractPrompt;
}

export interface AtlasSelfTest { name: string; pass: boolean; details: string }

const atlasCache = new Map<string, AtlasResult>();
const ATLAS_CACHE_MAX = 8;
const ATLAS_CACHE_MAX_CHARS = 300_000;

const atlasEncodeUncached = atlasEncode;
export function atlasEncodeCached(text: string, enc: EncodingName = 'o200k_base'): AtlasResult {
  const key = text.length <= ATLAS_CACHE_MAX_CHARS ? enc + '\u0000' + text : null;
  if (key) {
    const hit = atlasCache.get(key);
    if (hit) return hit;
  }
  const result = atlasEncodeUncached(text, enc);
  if (key) {
    if (atlasCache.size >= ATLAS_CACHE_MAX) atlasCache.clear();
    atlasCache.set(key, result);
  }
  return result;
}

export const ATLAS_HANDTRACE_300 =
  'Ship it: retry 3x, never log secrets.\n' +
  '{"id":7,"ok":true}\n{"id":8,"ok":true}\n' +
  'id,ms\na,12\nb,12\n' +
  '##..##\n##..##\n' +
  'for(let i=0;i<3;i++){s+=a[i];}\n' +
  'for(let j=0;j<3;j++){s+=a[j];}\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.';

export function atlasSelfTest(enc: EncodingName = 'o200k_base'): AtlasSelfTest[] {
  const jsonLog = Array.from({ length: 40 }, (_, i) =>
    `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
  ).join('\n');
  const rle = 'A'.repeat(800) + 'B'.repeat(600);
  const prose = 'The quick brown fox jumps over the lazy dog while the committee deliberates on whether a second breakfast constitutes an institutional precedent.';
  const agentTurn = prose + '\n' + jsonLog + '\n' + rle;
  const cases = [
    { name: 'A0 empty', text: '' },
    { name: 'A1 tiny', text: 'one short line' },
    { name: 'A2 hand-300 hetero', text: ATLAS_HANDTRACE_300 },
    { name: 'A3 json log', text: jsonLog },
    { name: 'A4 run-length', text: rle },
    { name: 'A5 agent turn', text: agentTurn },
    { name: 'A6 CRLF+CJK+emoji', text: 'l1\r\nl2\r\n中文 🚀🚀 ≈done\r\n'.repeat(6) },
    { name: 'A7 MZ1 adversary', text: '[MZ1]\n一\nnot a wire' },
  ];
  const out: AtlasSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = atlasEncode(c.text, enc);
      const rt = atlasDecode(r.wire) === c.text;
      out.push({
        name: c.name,
        pass: rt && r.exact && r.outTokens <= r.inTokens,
        details: `${r.member} wire ${r.inTokens}→${r.outTokens} deliv ${r.deliveredTokens} (${r.deliveredVsRaw} vs raw)`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }
  try {
    const shapes = [ATLAS_HANDTRACE_300, jsonLog, rle, prose, agentTurn];
    const losses: string[] = [];
    for (const text of shapes) {
      const a = atlasEncode(text, enc);
      const m = mosaicEncode(text, enc);
      const mDelivered = m.outTokens + countTokens(mosaicDecoderPrompt(m), enc);
      if (a.deliveredTokens > mDelivered) losses.push(`${a.deliveredTokens}>${mDelivered}`);
    }
    out.push({ name: 'A8 delivered ≤ MOSAIC on every shape', pass: losses.length === 0, details: losses.length === 0 ? 'clean' : losses.join(', ') });
  } catch (e) {
    out.push({ name: 'A8 delivered ≤ MOSAIC on every shape', pass: false, details: (e as Error).message });
  }
  return out;
}