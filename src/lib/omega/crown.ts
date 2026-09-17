/** ♛ CROWN-C1 — Delivered-objective universal exact tournament. */
import { countTokens, type EncodingName } from './bpe';
import { atlasDecode, atlasEncodeCached as atlasEncode, atlasDecoderPrompt, type AtlasResult } from './atlas';
import { auroraDecode, auroraEncodeCached as auroraEncode, auroraDecoderPrompt, type AuroraResult } from './aurora';
import { mosaicDecode, mosaicEncode, mosaicDecoderPrompt, type MosaicResult } from './mosaic';
import { orbitEncode, orbitDecoderPrompt, type OrbitResult } from './orbit';
import { signetEncode, signetDecode, SIGNET_SYSTEM_PROMPT, type SignetResult } from './signet';
import { helixEncode, helixDecode, HELIX_SYSTEM_PROMPT, type HelixResult } from './helix';
import { pulseEncode, pulseDecode, PULSE_SYSTEM_PROMPT, type PulseResult } from './pulse';
import { anaphoraEncode, anaphoraDecode, anaphoraDecoderPrompt, type AnaphoraResult } from './anaphora';
import { valkyrieEncode, valkyrieDecode, VALKYRIE_SYSTEM_PROMPT, type ValkyrieResult } from './valkyrie';
import { aetherEncode, aetherDecode, AETHER_SYSTEM_PROMPT, type AetherResult } from './aether';
import { yggdrasilEncode, yggdrasilDecode, YGGDRASIL_SYSTEM_PROMPT, type YggdrasilResult } from './yggdrasil';
import { oblivionEncode, oblivionDecode, OBLIVION_SYSTEM_PROMPT, type OblivionResult } from './oblivion';
import { eidolonEncode, eidolonDecode, EIDOLON_SYSTEM_PROMPT, type EidolonResult } from './eidolon';
import { encodeTerminus, decodeTerminus, TERMINUS_SENTINEL } from './terminus';
import { zenithEncode, zenithDecode, ZENITH_SYSTEM_PROMPT, type ZenithResult } from './zenith';
import { chronosEncode, chronosDecode, CHRONOS_SYSTEM_PROMPT, type ChronosResult } from './chronos-x1';
import { hyperionEncode, hyperionDecode, HYPERION_SYSTEM_PROMPT, type HyperionResult } from './hyperion';
import { pallasEncode, pallasDecode, PALLAS_SYSTEM_PROMPT, type PallasResult } from './pallas';
import { astraeaEncode, astraeaDecode, ASTRAEA_SYSTEM_PROMPT, type AstraeaResult } from './starlight-prime';
import { starlightEncode, starlightDecode, STARLIGHT_SYSTEM_PROMPT, type StarlightResult } from './starlight';

export interface CrownAudit { lane: string; wire: number; contract: number; delivered: number }
export interface CrownResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  contractTokens: number;
  deliveredTokens: number;
  deliveredVsRaw: number;
  member: string;
  decoderPrompt: string;
  notes: string;
  encodeMs: number;
  audit: CrownAudit[];
}

interface Member { lane: string; wire: string; decoded: string; contract: string; decode: (w: string) => string }

export interface CrownSuppliedMembers {
  terminus?: any;
  eidolon?: EidolonResult;
  oblivion?: OblivionResult;
  yggdrasil?: YggdrasilResult;
  aether?: AetherResult;
  valkyrie?: ValkyrieResult;
  zenith?: ZenithResult;
  chronos?: ChronosResult;
  hyperion?: HyperionResult;
  pallas?: PallasResult;
  astraea?: AstraeaResult;
  starlight?: StarlightResult;
  atlas?: AtlasResult;
  aurora?: AuroraResult;
  mosaic?: MosaicResult;
  orbit?: OrbitResult;
  signet?: SignetResult;
  helix?: HelixResult;
  pulse?: PulseResult;
  anaphora?: AnaphoraResult;
}

export function crownDecode(wire: string): string {
  if (wire.startsWith(TERMINUS_SENTINEL)) return decodeTerminus(wire);
  for (const fn of [decodeTerminus, eidolonDecode, oblivionDecode, yggdrasilDecode, aetherDecode, valkyrieDecode, zenithDecode, chronosDecode, hyperionDecode, pallasDecode, astraeaDecode, starlightDecode, atlasDecode, auroraDecode, mosaicDecode, signetDecode, pulseDecode, anaphoraDecode, helixDecode]) {
    try {
      const d = fn(wire);
      if (d !== wire) return d;
    } catch {
      /* try next */
    }
  }
  return wire;
}

export async function crownEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<CrownResult> {
  return crownEncodeFromMembers(text, enc);
}

/**
 * Same exact tournament, but accepts already-computed lane results. The worker
 * uses this path so CROWN is O(comparisons), not a recursive second execution
 * of every tournament and structural codec.
 */
export async function crownEncodeFromMembers(
  text: string,
  enc: EncodingName = 'o200k_base',
  supplied: CrownSuppliedMembers = {},
): Promise<CrownResult> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string, audit: CrownAudit[] = []): CrownResult => ({
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
    decoderPrompt: '',
    notes,
    encodeMs: ms(),
    audit,
  });
  if (!text) return identity('empty input');

  const memberTasks: Array<Promise<Member | null>> = [
    Promise.resolve({ lane: 'identity', wire: text, decoded: text, contract: '', decode: (w) => w }),
    Promise.resolve().then(() => {
      const r = supplied.terminus ?? encodeTerminus(text, enc);
      return { lane: 'terminus', wire: r.wire, decoded: r.decoded, contract: '★ TERMINUS-T1: Terminal Architecture lossless direct-reasoning CJK dictionary codec.', decode: decodeTerminus };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.eidolon ?? eidolonEncode(text, enc);
      return { lane: 'eidolon', wire: r.wire, decoded: r.decoded, contract: EIDOLON_SYSTEM_PROMPT, decode: eidolonDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.oblivion ?? oblivionEncode(text, enc);
      return { lane: 'oblivion', wire: r.wire, decoded: r.decoded, contract: OBLIVION_SYSTEM_PROMPT, decode: oblivionDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.yggdrasil ?? yggdrasilEncode(text, enc);
      return { lane: 'yggdrasil', wire: r.wire, decoded: r.decoded, contract: YGGDRASIL_SYSTEM_PROMPT, decode: yggdrasilDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.aether ?? aetherEncode(text, enc);
      return { lane: 'aether', wire: r.wire, decoded: r.decoded, contract: AETHER_SYSTEM_PROMPT, decode: aetherDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.valkyrie ?? valkyrieEncode(text, enc);
      return { lane: 'valkyrie', wire: r.wire, decoded: r.decoded, contract: VALKYRIE_SYSTEM_PROMPT, decode: valkyrieDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.zenith ?? zenithEncode(text, enc);
      return { lane: 'zenith', wire: r.wire, decoded: r.decoded, contract: ZENITH_SYSTEM_PROMPT, decode: zenithDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.chronos ?? chronosEncode(text, enc);
      return { lane: 'chronos', wire: r.wire, decoded: r.decoded, contract: CHRONOS_SYSTEM_PROMPT, decode: chronosDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.hyperion ?? hyperionEncode(text, enc);
      return { lane: 'hyperion', wire: r.wire, decoded: r.decoded, contract: HYPERION_SYSTEM_PROMPT, decode: hyperionDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.pallas ?? pallasEncode(text, enc);
      return { lane: 'pallas', wire: r.wire, decoded: r.decoded, contract: PALLAS_SYSTEM_PROMPT, decode: pallasDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.astraea ?? astraeaEncode(text, enc);
      return { lane: 'astraea', wire: r.wire, decoded: r.decoded, contract: ASTRAEA_SYSTEM_PROMPT, decode: astraeaDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.starlight ?? starlightEncode(text, enc);
      return { lane: 'starlight', wire: r.wire, decoded: r.decoded, contract: STARLIGHT_SYSTEM_PROMPT, decode: starlightDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.atlas ?? atlasEncode(text, enc);
      return { lane: 'atlas', wire: r.wire, decoded: r.decoded, contract: atlasDecoderPrompt(r), decode: atlasDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.aurora ?? auroraEncode(text, enc);
      return { lane: 'aurora', wire: r.wire, decoded: r.decoded, contract: auroraDecoderPrompt(r), decode: auroraDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.mosaic ?? mosaicEncode(text, enc);
      return { lane: 'mosaic', wire: r.wire, decoded: r.decoded, contract: mosaicDecoderPrompt(r), decode: mosaicDecode };
    }).catch(() => null),
    Promise.resolve().then(async () => {
      const r = supplied.orbit ?? await orbitEncode(text, enc, null, []);
      return { lane: 'orbit', wire: r.wire, decoded: r.decoded, contract: orbitDecoderPrompt(r), decode: crownDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.signet ?? signetEncode(text, enc);
      return { lane: 'signet', wire: r.wire, decoded: r.decoded, contract: SIGNET_SYSTEM_PROMPT, decode: signetDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.helix ?? helixEncode(text, enc);
      return { lane: 'helix', wire: r.wire, decoded: r.decoded, contract: HELIX_SYSTEM_PROMPT, decode: helixDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.pulse ?? pulseEncode(text, enc);
      return { lane: 'pulse', wire: r.wire, decoded: r.decoded, contract: PULSE_SYSTEM_PROMPT, decode: pulseDecode };
    }).catch(() => null),
    Promise.resolve().then(() => {
      const r = supplied.anaphora ?? anaphoraEncode(text, enc);
      return { lane: 'anaphora', wire: r.wire, decoded: r.decoded, contract: anaphoraDecoderPrompt(r), decode: anaphoraDecode };
    }).catch(() => null),
  ];

  const resolvedMembers = await Promise.all(memberTasks);
  const members: Member[] = resolvedMembers.filter((m): m is Member => m !== null);

  const audit: CrownAudit[] = [];
  let best: Member | null = null;
  let bestDelivered = Number.POSITIVE_INFINITY;
  let bestWire = Number.POSITIVE_INFINITY;
  let bestContract = 0;
  for (const m of members) {
    if (m.decode(m.wire) !== text) continue;
    const wire = countTokens(m.wire, enc);
    const contract = countTokens(m.contract, enc);
    const delivered = wire + contract;
    audit.push({ lane: m.lane, wire, contract, delivered });
    if (delivered < bestDelivered || (delivered === bestDelivered && wire < bestWire)) {
      best = m;
      bestDelivered = delivered;
      bestWire = wire;
      bestContract = contract;
    }
  }
  audit.sort((a, b) => a.delivered - b.delivered || a.wire - b.wire);
  if (!best || best.lane === 'identity') return identity('identity delivers fewest tokens once contract is counted', audit);
  if (bestWire >= inTokens) return identity('gate: winner wire not smaller', audit);
  const decoded = best.decode(best.wire);
  if (decoded !== text) return identity('gate: winner failed byte-verify', audit);
  return {
    wire: best.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens: bestWire,
    savingsPct: inTokens ? ((inTokens - bestWire) / inTokens) * 100 : 0,
    contractTokens: bestContract,
    deliveredTokens: bestDelivered,
    deliveredVsRaw: inTokens - bestDelivered,
    member: best.lane,
    decoderPrompt: best.contract,
    notes: `CROWN winner=${best.lane} · wire ${inTokens}->${bestWire} · contract ${bestContract} · delivered ${bestDelivered} (${inTokens - bestDelivered >= 0 ? '+' : ''}${inTokens - bestDelivered} vs raw) · byte-exact`,
    encodeMs: ms(),
    audit,
  };
}

export const CROWN_SYSTEM_PROMPT = '♛ CROWN-C1: delivered-objective tournament. Read the wire by its own visible codec header. Reconstruction is byte-exact.';
export function crownDecoderPrompt(r?: CrownResult | null): string { return r?.decoderPrompt ?? CROWN_SYSTEM_PROMPT; }

export interface CrownSelfTest { name: string; pass: boolean; details: string }

const crownCache = new Map<string, CrownResult>();
const CROWN_CACHE_MAX = 8;
const CROWN_CACHE_MAX_CHARS = 300_000;

const crownEncodeUncached = crownEncode;
export async function crownEncodeCached(text: string, enc: EncodingName = 'o200k_base'): Promise<CrownResult> {
  const key = text.length <= CROWN_CACHE_MAX_CHARS ? enc + '\u0000' + text : null;
  if (key) {
    const hit = crownCache.get(key);
    if (hit) return hit;
  }
  const result = await crownEncodeUncached(text, enc);
  if (key) {
    if (crownCache.size >= CROWN_CACHE_MAX) crownCache.clear();
    crownCache.set(key, result);
  }
  return result;
}
export async function crownSelfTest(enc: EncodingName = 'o200k_base'): Promise<CrownSelfTest[]> {
  const json = Array.from({ length: 24 }, (_, i) => `{"id":${i},"ok":true,"svc":"gateway"}`).join('\n');
  const rle = 'A'.repeat(500) + 'B'.repeat(500);
  const agent = 'The quick brown fox.\n' + json + '\n' + rle;
  const cases = [{ name: 'C0 empty', text: '' }, { name: 'C1 json', text: json }, { name: 'C2 rle', text: rle }, { name: 'C3 agent', text: agent }];
  const out: CrownSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = await crownEncode(c.text, enc);
      out.push({ name: c.name, pass: crownDecode(r.wire) === c.text && r.exact && r.outTokens <= r.inTokens, details: `${r.member} wire ${r.inTokens}->${r.outTokens} delivered ${r.deliveredTokens}` });
    } catch (e) { out.push({ name: c.name, pass: false, details: (e as Error).message }); }
  }
  return out;
}
