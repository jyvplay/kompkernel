/**
 * ZENITH-Z1 — exact readable-lane portfolio with a compiled decoder contract.
 *
 * The admissible object is a pair (wire, contract).  The wire must decode to the
 * input exactly; the score is real tokenizer tokens(wire)+tokens(contract).
 * ZENITH delegates wire search to CROWN's exact tournament (which includes
 * MOSAIC and all of CROWN's readable members), then compiles the selected
 * contract through KERNEL.  KERNEL compares its specialized contract with the
 * IRIS contract, so the emitted pair is never more expensive than CROWN's pair.
 *
 * This is a weak Pareto guarantee, not a claim of strict improvement on every
 * input: no lossless codec can strictly beat identity on every possible input.
 * The identity candidate and every exactness gate are retained.
 */
import { countTokens, type EncodingName } from './bpe';
import { kernelEncode, kernelDecoderPrompt, type KernelResult } from './kernel';

export interface ZenithResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  contractPrompt: string;
  contractTokens: number;
  deliveredTokens: number;
  deliveredVsRaw: number;
  savingsPct: number;
  sourceMember: string;
  renderer: 'zenith-kernel';
  notes: string;
  encodeMs: number;
}

export function zenithEncodeFromKernel(
  text: string,
  kernel: KernelResult,
  enc: EncodingName = 'o200k_base',
): ZenithResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const contractPrompt = kernelDecoderPrompt(kernel);
  const inTokens = countTokens(text, enc);
  const outTokens = countTokens(kernel.wire, enc);
  const contractTokens = countTokens(contractPrompt, enc);
  const deliveredTokens = outTokens + contractTokens;
  const exact = kernel.exact && kernel.decoded === text;
  // A defensive final gate prevents a future member change from turning this
  // meta-codec into an unverified result.
  if (!exact || deliveredTokens > inTokens) {
    return {
      wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
      contractPrompt: '', contractTokens: 0, deliveredTokens: inTokens,
      deliveredVsRaw: 0, savingsPct: 0, sourceMember: 'identity',
      renderer: 'zenith-kernel',
      notes: 'ZENITH gate: exact delivered candidate unavailable; identity emitted.',
      encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
    };
  }
  return {
    wire: kernel.wire,
    decoded: kernel.decoded,
    exact,
    inTokens,
    outTokens,
    contractPrompt,
    contractTokens,
    deliveredTokens,
    deliveredVsRaw: inTokens - deliveredTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    sourceMember: kernel.sourceMember,
    renderer: 'zenith-kernel',
    notes: `ZENITH weak-Pareto gate: CROWN member ${kernel.sourceMember}; KERNEL contract ${contractTokens} tokens; exact wire preserved`,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

export async function zenithEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<ZenithResult> {
  return zenithEncodeFromKernel(text, await kernelEncode(text, enc), enc);
}

export function zenithDecoderPrompt(result?: ZenithResult | null): string {
  return result?.contractPrompt ?? 'ZENITH-Z1: execute the exact selected readable-lane decoder contract.';
}

export interface ZenithSelfTest { name: string; pass: boolean; details: string }
export async function zenithSelfTest(enc: EncodingName = 'o200k_base'): Promise<ZenithSelfTest[]> {
  const cases = [
    { name: 'empty', text: '' },
    { name: 'repeated records', text: Array.from({ length: 32 }, (_, i) => `{"id":${i},"ok":true,"svc":"gateway"}`).join('\n') },
    { name: 'mixed exact input', text: 'header\n' + 'A'.repeat(700) + '\n' + '{"ok":true}\n' + 'tail' },
  ];
  const out: ZenithSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = await zenithEncode(c.text, enc);
      out.push({ name: c.name, pass: r.exact && r.decoded === c.text && r.deliveredTokens <= r.inTokens, details: `${r.sourceMember} delivered ${r.deliveredTokens}/${r.inTokens}` });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }
  return out;
}
