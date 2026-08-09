/**
 * ◇ AURORA-A1 — Contract-Aware Partition DP
 * =============================================================================
 * MOSAIC minimises wire tokens and only afterwards ships the union of lane
 * contracts. ATLAS notices the delivered objective, but can only choose between
 * whole-document members and MOSAIC's already-fixed partition. AURORA changes
 * the recurrence itself: the DP state includes the set of lane contracts already
 * needed, so it directly minimises wire + contract.
 *
 * This is non-tournament: it is a single optimisation problem over partitions
 * with state (position, lane-mask). The one-region path is in the state graph,
 * so it cannot lose to any member lane on delivered cost; the output still
 * carries no wrapper for a one-region result, preserving zero-overhead
 * degeneracy.
 */
import { countTokens, type EncodingName } from './bpe';
import { signetEncode, signetDecode, SIGNET_SYSTEM_PROMPT } from './signet';
import { helixEncode, helixDecode, HELIX_SYSTEM_PROMPT } from './helix';
import { pulseEncode, pulseDecode, PULSE_SYSTEM_PROMPT } from './pulse';
import { anaphoraEncode, anaphoraDecode, anaphoraDecoderPrompt } from './anaphora';
import { ideographPool } from './strata';

export interface AuroraRegion { lane: string; lines: number; inTokens: number; outTokens: number }
export interface AuroraResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  contractTokens: number;
  deliveredTokens: number;
  deliveredVsRaw: number;
  regions: AuroraRegion[];
  mode: 'aurora' | 'single' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

const SENTINEL = '[AR1]\n';
const MAX_BLOCKS = 10;
const MAX_CHARS = 300_000;
const MAX_LINES = 40_000;
const REGIME_SIG_CAP = 48;
const REGIME_SCAN_CAP = 200;

interface Lane {
  bit: number;
  tag: string;
  name: string;
  encode: (t: string, enc: EncodingName) => { wire: string; applied: boolean };
  decode: (w: string) => string;
  contract: string;
}

const LANES: Lane[] = [
  { bit: 0, tag: 'i', name: 'identity', encode: (t) => ({ wire: t, applied: true }), decode: (w) => w, contract: '' },
  { bit: 1, tag: 'g', name: 'signet', encode: (t, e) => { const r = signetEncode(t, e); return { wire: r.wire, applied: r.mode === 'signet' }; }, decode: signetDecode, contract: SIGNET_SYSTEM_PROMPT },
  { bit: 2, tag: 'h', name: 'helix', encode: (t, e) => { const r = helixEncode(t, e); return { wire: r.wire, applied: r.mode === 'factored' }; }, decode: helixDecode, contract: HELIX_SYSTEM_PROMPT },
  { bit: 4, tag: 'p', name: 'pulse', encode: (t, e) => { const r = pulseEncode(t, e); return { wire: r.wire, applied: r.mode === 'pulse' }; }, decode: pulseDecode, contract: PULSE_SYSTEM_PROMPT },
  { bit: 8, tag: 'a', name: 'anaphora', encode: (t, e) => { const r = anaphoraEncode(t, e); return { wire: r.wire, applied: r.mode === 'anaphoric' }; }, decode: anaphoraDecode, contract: anaphoraDecoderPrompt(null) },
];

const LANE_BY_TAG = new Map<string, Lane>(LANES.map((l) => [l.tag, l]));

function classOf(code: number): number {
  if (code >= 48 && code <= 57) return 1;
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return 2;
  return 3;
}
function lineRegime(line: string): string {
  let sig = '';
  let i = 0;
  const n = Math.min(line.length, REGIME_SCAN_CAP);
  while (i < n) {
    const c = classOf(line.charCodeAt(i));
    let j = i + 1;
    while (j < n && classOf(line.charCodeAt(j)) === c) j++;
    sig += c;
    i = j;
    if (sig.length >= REGIME_SIG_CAP) break;
  }
  return sig;
}
function hasUnitRun(s: string, min: number): boolean {
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    if (s.charCodeAt(i) === s.charCodeAt(i - 1)) {
      if (++run >= min) return true;
    } else run = 1;
  }
  return false;
}
function digitRunCount(s: string, cap: number): number {
  let n = 0;
  let inRun = false;
  for (let i = 0; i < s.length; i++) {
    const d = s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57;
    if (d && !inRun) { if (++n >= cap) return n; inRun = true; }
    else if (!d) inRun = false;
  }
  return n;
}
function blockBounds(lines: string[]): number[] {
  let bounds: number[] = [0];
  for (let i = 1; i < lines.length; i++) if (lineRegime(lines[i]) !== lineRegime(lines[i - 1])) bounds.push(i);
  bounds.push(lines.length);
  const cum = new Float64Array(lines.length + 1);
  for (let i = 0; i < lines.length; i++) cum[i + 1] = cum[i] + lines[i].length + 1;
  while (bounds.length - 1 > MAX_BLOCKS) {
    let victim = 1;
    let cost = Number.POSITIVE_INFINITY;
    for (let i = 1; i < bounds.length - 1; i++) {
      const c = cum[bounds[i + 1]] - cum[bounds[i - 1]];
      if (c < cost) { cost = c; victim = i; }
    }
    bounds.splice(victim, 1);
  }
  return bounds;
}
function contractCost(mask: number, enc: EncodingName): number {
  let s = '';
  for (const lane of LANES) if (lane.bit && (mask & lane.bit)) s += lane.contract + '\n';
  return countTokens(s, enc);
}
function bareDecode(wire: string, depth = 0): string {
  if (depth > 4) return wire;
  if (wire.startsWith('[SG1]\n')) return signetDecode(wire);
  if (wire.startsWith('[P1]\n')) return pulseDecode(wire);
  if (wire.startsWith('[AN1]\n')) { const d = anaphoraDecode(wire); return d === wire ? wire : bareDecode(d, depth + 1); }
  return helixDecode(wire);
}
export function auroraDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return bareDecode(wire);
  const rest = wire.slice(SENTINEL.length);
  const sep = rest[0];
  if (sep === undefined || rest[1] !== '\n') return wire;
  const pieces = rest.slice(2).split(sep);
  if (pieces.length < 2 || pieces[0] !== '') return wire;
  const out: string[] = [];
  for (let i = 1; i < pieces.length; i++) {
    const p = pieces[i];
    const lane = LANE_BY_TAG.get(p[0]);
    if (!lane) return wire;
    out.push(lane.decode(p.slice(1)));
  }
  return out.join('\n');
}

interface Span { tag: string; wire: string; tokens: number; mask: number }

export function auroraEncode(text: string, enc: EncodingName = 'o200k_base'): AuroraResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): AuroraResult => ({ wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens, savingsPct: 0, contractTokens: 0, deliveredTokens: inTokens, deliveredVsRaw: 0, regions: [], mode: 'identity', notes, encodeMs: ms() });
  if (!text) return identity('empty input');
  const lines = text.split('\n');
  const spanMemo = new Map<string, Span[]>();
  const spans = (a: number, b: number): Span[] => {
    const key = a + ':' + b;
    const hit = spanMemo.get(key);
    if (hit) return hit;
    const src = lines.slice(a, b).join('\n');
    const okPulse = hasUnitRun(src, 4);
    const okHelix = digitRunCount(src, 3) >= 3;
    const arr: Span[] = [];
    for (const lane of LANES) {
      if (lane.tag === 'p' && !okPulse) continue;
      if (lane.tag === 'h' && !okHelix) continue;
      if (lane.tag === 'g' && b - a < 2) continue;
      if (lane.tag === 'a' && src.length < 16) continue;
      const r = lane.encode(src, enc);
      if (!r.applied && lane.tag !== 'i') continue;
      if (lane.decode(r.wire) !== src) continue;
      arr.push({ tag: lane.tag, wire: r.wire, tokens: countTokens(r.wire, enc), mask: lane.bit });
    }
    spanMemo.set(key, arr);
    return arr;
  };

  type Cand = { wire: string; regions: AuroraRegion[]; mode: AuroraResult['mode']; mask: number };
  const candidates: Cand[] = [];
  // Whole-document no-wrapper candidates.
  for (const sp of spans(0, lines.length)) {
    candidates.push({ wire: sp.wire, regions: [{ lane: LANE_BY_TAG.get(sp.tag)!.name, lines: lines.length, inTokens, outTokens: sp.tokens }], mode: 'single', mask: sp.mask });
  }

  if (text.length <= MAX_CHARS && lines.length <= MAX_LINES) {
    const bounds = blockBounds(lines);
    const B = bounds.length - 1;
    const INF = 1e15;
    const dp: number[][] = Array.from({ length: B + 1 }, () => new Array(16).fill(INF));
    const prev: Array<Array<{ i: number; mask: number; sp: Span } | null>> = Array.from({ length: B + 1 }, () => new Array(16).fill(null));
    dp[0][0] = 0;
    for (let j = 1; j <= B; j++) {
      for (let i = 0; i < j; i++) {
        for (let pm = 0; pm < 16; pm++) {
          if (dp[i][pm] >= INF) continue;
          for (const sp of spans(bounds[i], bounds[j])) {
            const nm = pm | sp.mask;
            const addFrame = 2;
            const cost = dp[i][pm] + sp.tokens + addFrame;
            if (cost < dp[j][nm]) { dp[j][nm] = cost; prev[j][nm] = { i, mask: pm, sp }; }
          }
        }
      }
    }
    let bestMask = 0;
    let bestDelivered = INF;
    for (let m = 0; m < 16; m++) {
      const delivered = dp[B][m] + contractCost(m, enc);
      if (delivered < bestDelivered) { bestDelivered = delivered; bestMask = m; }
    }
    if (bestDelivered < INF) {
      const segs: { tag: string; wire: string; a: number; b: number; tokens: number; mask: number }[] = [];
      let j = B;
      let m = bestMask;
      while (j > 0) {
        const p = prev[j][m];
        if (!p) { segs.length = 0; break; }
        segs.push({ tag: p.sp.tag, wire: p.sp.wire, a: bounds[p.i], b: bounds[j], tokens: p.sp.tokens, mask: p.sp.mask });
        j = p.i; m = p.mask;
      }
      if (segs.length >= 2) {
        segs.reverse();
        const hay = text + '\0' + segs.map((s) => s.wire).join('\0');
        const sep = ideographPool(enc).find((ch) => hay.indexOf(ch) === -1);
        if (sep) {
          const wire = SENTINEL + sep + '\n' + segs.map((s) => sep + s.tag + s.wire).join('');
          candidates.push({
            wire,
            mask: bestMask,
            mode: 'aurora',
            regions: segs.map((s) => ({ lane: LANE_BY_TAG.get(s.tag)!.name, lines: s.b - s.a, inTokens: countTokens(lines.slice(s.a, s.b).join('\n'), enc), outTokens: s.tokens })),
          });
        }
      }
    }
  }

  let best: Cand | null = null;
  let bestDelivered = inTokens;
  let bestWire = inTokens;
  for (const c of candidates) {
    if (auroraDecode(c.wire) !== text) continue;
    const wt = countTokens(c.wire, enc);
    const dt = wt + contractCost(c.mask, enc);
    if (dt < bestDelivered || (dt === bestDelivered && wt < bestWire)) { best = c; bestDelivered = dt; bestWire = wt; }
  }
  if (!best) return identity('identity delivered fewest tokens');
  const decoded = auroraDecode(best.wire);
  if (decoded !== text) return identity('gate: byte-verify failed');
  if (bestWire >= inTokens && !text.startsWith(SENTINEL)) return identity('gate: winner wire not smaller');
  const contractTokens = contractCost(best.mask, enc);
  return { wire: best.wire, decoded, exact: true, inTokens, outTokens: bestWire, savingsPct: inTokens ? ((inTokens - bestWire) / inTokens) * 100 : 0, contractTokens, deliveredTokens: bestDelivered, deliveredVsRaw: inTokens - bestDelivered, regions: best.regions, mode: best.mode, notes: `AURORA delivered-DP · ${best.regions.length} region(s) · contract ${contractTokens} · delivered ${bestDelivered}`, encodeMs: ms() };
}

export function auroraDecoderPrompt(r?: AuroraResult | null): string {
  const used = new Set((r?.regions ?? []).map((x) => x.lane));
  const parts = ['# ◇ AURORA-A1 — contract-aware partition wire'];
  parts.push('If [AR1], line 2 declares separator S. Split S<tag><region> chunks, decode each region by tag, join with newline. If no [AR1], read by the leading region header or literally.');
  if (!r || used.has('signet')) parts.push(SIGNET_SYSTEM_PROMPT);
  if (!r || used.has('helix')) parts.push(HELIX_SYSTEM_PROMPT);
  if (!r || used.has('pulse')) parts.push(PULSE_SYSTEM_PROMPT);
  if (!r || used.has('anaphora')) parts.push(anaphoraDecoderPrompt(null));
  return parts.join('\n\n');
}

export const AURORA_SYSTEM_PROMPT = auroraDecoderPrompt(null);

export interface AuroraSelfTest { name: string; pass: boolean; details: string }

const auroraCache = new Map<string, AuroraResult>();
const AURORA_CACHE_MAX = 8;
const AURORA_CACHE_MAX_CHARS = 300_000;

const auroraEncodeUncached = auroraEncode;
export function auroraEncodeCached(text: string, enc: EncodingName = 'o200k_base'): AuroraResult {
  const key = text.length <= AURORA_CACHE_MAX_CHARS ? enc + '\u0000' + text : null;
  if (key) {
    const hit = auroraCache.get(key);
    if (hit) return hit;
  }
  const result = auroraEncodeUncached(text, enc);
  if (key) {
    if (auroraCache.size >= AURORA_CACHE_MAX) auroraCache.clear();
    auroraCache.set(key, result);
  }
  return result;
}
export function auroraSelfTest(enc: EncodingName = 'o200k_base'): AuroraSelfTest[] {
  const jsonLog = Array.from({ length: 40 }, (_, i) => `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`).join('\n');
  const rle = 'A'.repeat(800) + 'B'.repeat(600);
  const prose = 'The quick brown fox jumps over the lazy dog while the committee deliberates on whether a second breakfast constitutes an institutional precedent.';
  const agent = prose + '\n' + jsonLog + '\n' + rle + '\n' + Array.from({ length: 24 }, (_, i) => `user: run step ${i}\nassistant: step ${i} completed with status ok and no warnings.`).join('\n');
  const cases = [{ name: 'R0 empty', text: '' }, { name: 'R1 json', text: jsonLog }, { name: 'R2 rle', text: rle }, { name: 'R3 agent', text: agent }, { name: 'R4 prose', text: prose }];
  const out: AuroraSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = auroraEncode(c.text, enc);
      out.push({ name: c.name, pass: auroraDecode(r.wire) === c.text && r.exact && r.outTokens <= r.inTokens, details: `${r.mode} wire ${r.inTokens}->${r.outTokens} delivered ${r.deliveredTokens}` });
    } catch (e) { out.push({ name: c.name, pass: false, details: (e as Error).message }); }
  }
  return out;
}