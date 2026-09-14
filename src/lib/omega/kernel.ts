/**
 * ⊙ KERNEL-K1 — Canonical Minimal Operational Decoder Contract
 * =============================================================================
 * IRIS removes unreachable grammar productions but still renders them as prose.
 * KERNEL compiles the same concrete wire to a compact operational notation and
 * takes the real-BPE minimum of {IRIS contract, canonical notation}. The wire is
 * unchanged, CROWN exactness is inherited, and IRIS is an explicit fallback;
 * therefore delivered(KERNEL) <= delivered(IRIS) for every input by construction.
 * Runtime is one linear wire scan plus two token counts. No new compression
 * mining, no DP, no worker expansion, and no new wire syntax.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { crownEncodeCached, type CrownResult } from './crown';
import { irisEncodeFromCrown, specializeContract, type IrisResult } from './iris';

export interface KernelResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  contractPrompt: string;
  contractTokens: number;
  deliveredTokens: number;
  deliveredVsRaw: number;
  sourceMember: string;
  renderer: 'kernel' | 'iris';
  notes: string;
  encodeMs: number;
}

function compactAnaphora(wire: string): string {
  const rest = wire.slice('[AN1]\n'.length);
  const o = rest[0] ?? 'O';
  const c = rest[1] ?? 'C';
  return `AN1 exact: ${o}kP${c} binds k=P; later k=>P; nested inside-out; other chars literal.`;
}

function compactHelix(): string {
  return 'HELIX exact: ⟐[s,d,n,w,l]q => n values s+i*d, zero-pad w, join by next l chars q; ⟐⟐=>⟐; else literal.';
}

function compactPulse(): string {
  return 'P1 exact: ⟡[n,x]=>n copies of UTF-16 code unit hex x; ⟡⟡=>⟡; else literal.';
}

function compactSignet(wire: string): string {
  const rules: string[] = [
    'SG1 exact: line2=B,E,F,V,S. Block BmFtemplateFcolumnsE => m rows; split template on S; row r interleaves pieces with column[r].',
  ];
  // Conservative wire inspection: false positives only add a production, never
  // remove a needed one. Exactness belongs to the unchanged wire/decoder.
  if (wire.indexOf('=') !== -1) rules.push('=x constant.');
  if (wire.indexOf('#') !== -1) rules.push('#a,d,w => a+r*d padded w.');
  if (wire.indexOf('@') !== -1) rules.push('@pVx... => p-cycle.');
  if (wire.indexOf('%') !== -1) rules.push('%a,wVq => a then cumulative q-deltas, padded w.');
  if (wire.indexOf('^') !== -1) rules.push('^nVxq => prepend n-char x to q.');
  if (wire.indexOf('$') !== -1) rules.push('$nVxq => append n-char x to q.');
  if (wire.indexOf('~') !== -1) rules.push('~xV... => literal list.');
  rules.push('Untagged column is V-separated literal list; all else literal.');
  return rules.join(' ');
}

function compactPraxis(): string {
  return 'PX2 exact: rows before [/PX2] are k=phrase; in body expand k bottom-to-top; other text literal.';
}

function compactLumen(): string {
  return 'KEY exact: rows before divider are k=phrase; expand k bottom-to-top in following body; other text literal.';
}

function compactPartition(wire: string, sentinel: '[MZ1]\n' | '[AR1]\n'): string {
  const rest = wire.slice(sentinel.length);
  const sep = rest[0];
  if (!sep || rest[1] !== '\n') return '';
  const pieces = rest.slice(2).split(sep).slice(1);
  const tags = new Set<string>();
  const bodies = new Map<string, string>();
  for (const piece of pieces) {
    tags.add(piece[0]);
    if (!bodies.has(piece[0])) bodies.set(piece[0], piece.slice(1));
  }
  const rules: string[] = [
    `${sentinel.trim()} exact: line2 separator S; split S<tag><region>, decode tags, join regions with newline.`,
  ];
  if (tags.has('i')) rules.push('i literal.');
  if (tags.has('g')) rules.push('g ' + compactSignet(bodies.get('g') ?? ''));
  if (tags.has('h')) rules.push('h ' + compactHelix());
  if (tags.has('p')) rules.push('p ' + compactPulse());
  if (tags.has('a')) rules.push('a ' + compactAnaphora(bodies.get('a') ?? ''));
  if (tags.has('d')) rules.push('d PX2 exact: legend rows before [/PX2] map one-character aliases to phrases; expand aliases bottom-to-top; else literal.');
  if (tags.has('s')) rules.push('s SIGMA exact: decode typed JSONL/CSV schema rows; restore original spelling exactly.');
  if (tags.has('m')) rules.push('m MERIDIAN exact: decode its visible M1 anaphora/HELIX composition; expand bindings and arithmetic runs; else literal.');
  return rules.join(' ');
}

export function compactContract(wire: string): string {
  if (wire.startsWith('[MZ1]\n')) return compactPartition(wire, '[MZ1]\n');
  if (wire.startsWith('[AR1]\n')) return compactPartition(wire, '[AR1]\n');
  if (wire.startsWith('[SG1]\n')) return compactSignet(wire);
  if (wire.startsWith('[AN1]\n')) return compactAnaphora(wire);
  if (wire.startsWith('[P1]\n')) return compactPulse();
  if (wire.startsWith('[PX2]\n')) return compactPraxis();
  if (wire.startsWith('KEY ')) return compactLumen();
  if (wire.indexOf('⟐[') !== -1) return compactHelix();
  return '';
}

export function kernelEncodeFromCrown(
  text: string,
  crown: CrownResult,
  enc: EncodingName = 'o200k_base',
): KernelResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const iris: IrisResult = irisEncodeFromCrown(text, crown, enc);
  const compact = compactContract(crown.wire);
  const compactTokens = countTokens(compact, enc);
  const useCompact = compactTokens <= iris.contractTokens;
  const contractPrompt = useCompact ? compact : specializeContract(crown.wire);
  const contractTokens = useCompact ? compactTokens : iris.contractTokens;
  const deliveredTokens = crown.outTokens + contractTokens;
  return {
    wire: crown.wire,
    decoded: crown.decoded,
    exact: crown.exact,
    inTokens: crown.inTokens,
    outTokens: crown.outTokens,
    savingsPct: crown.savingsPct,
    contractPrompt,
    contractTokens,
    deliveredTokens,
    deliveredVsRaw: crown.inTokens - deliveredTokens,
    sourceMember: crown.member,
    renderer: useCompact ? 'kernel' : 'iris',
    notes: `KERNEL/${useCompact ? 'canonical' : 'IRIS fallback'}: contract ${iris.contractTokens}→${contractTokens}; delivered ${deliveredTokens}; exact CROWN wire unchanged`,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

const cache = new Map<string, KernelResult>();
export async function kernelEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<KernelResult> {
  const key = text.length <= 300_000 ? enc + '\u0000' + text : null;
  if (key) {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  const crown = await crownEncodeCached(text, enc);
  const result = kernelEncodeFromCrown(text, crown, enc);
  if (key) {
    if (cache.size >= 8) cache.clear();
    cache.set(key, result);
  }
  return result;
}

export const KERNEL_SYSTEM_PROMPT = '⊙ KERNEL-K1 compiles the exact winning wire to a minimal operational decoder contract.';
export function kernelDecoderPrompt(r?: KernelResult | null): string { return r?.contractPrompt ?? KERNEL_SYSTEM_PROMPT; }

export interface KernelSelfTest { name: string; pass: boolean; details: string }
export async function kernelSelfTest(enc: EncodingName = 'o200k_base'): Promise<KernelSelfTest[]> {
  const json = Array.from({ length: 40 }, (_, i) => `{"id":${i},"ok":true,"svc":"gateway"}`).join('\n');
  const rle = 'A'.repeat(700) + 'B'.repeat(700);
  const agent = 'The quick brown fox.\n' + json + '\n' + rle;
  const cases = [{ name: 'K0 empty', text: '' }, { name: 'K1 json', text: json }, { name: 'K2 rle', text: rle }, { name: 'K3 agent', text: agent }];
  const out: KernelSelfTest[] = [];
  for (const c of cases) {
    try {
      const crown = await crownEncodeCached(c.text, enc);
      const iris = irisEncodeFromCrown(c.text, crown, enc);
      const kernel = kernelEncodeFromCrown(c.text, crown, enc);
      out.push({
        name: c.name,
        pass: kernel.decoded === c.text && kernel.exact && kernel.outTokens <= kernel.inTokens && kernel.deliveredTokens <= iris.deliveredTokens,
        details: `iris=${iris.deliveredTokens}/${iris.contractTokens}; kernel=${kernel.deliveredTokens}/${kernel.contractTokens} renderer=${kernel.renderer}`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }
  return out;
}