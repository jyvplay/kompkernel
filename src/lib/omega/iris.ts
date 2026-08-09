/**
 * ◇ IRIS-I1 — Runtime Decoder-Contract Partial Evaluation
 * =============================================================================
 * ATLAS/CROWN optimize wire + a fixed decoder contract. The remaining blindspot
 * is that fixed contracts describe every production a codec COULD emit, while a
 * concrete wire uses only a tiny subset. IRIS specializes the decoder grammar
 * against the actual winning wire and emits only reachable productions.
 *
 * This is partial evaluation of a decoder: wire syntax is the static input,
 * message values are dynamic. It changes no wire byte and runs no new mining;
 * therefore exactness and raw-token savings are inherited from CROWN while
 * deliveredTokens can only decrease. The runtime cost is one linear wire scan.
 *
 * Decode-time grammar specialization (2026) validates the general technique of
 * compiling environment facts into a smaller runtime grammar. IRIS applies it
 * to lossless prompt decoding and measures the result with the real tokenizer.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { crownEncodeCached, crownDecode, type CrownResult } from './crown';

export interface IrisResult {
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
  notes: string;
  encodeMs: number;
}

function anaphoraContract(wire: string): string {
  const rest = wire.slice('[AN1]\n'.length);
  const open = rest[0] ?? 'OPEN';
  const close = rest[1] ?? 'CLOSE';
  return `AN1 exact bindings: ${open}kP${close} defines k=P at first use; later bare k means P. Binders may nest; all other text is literal.`;
}

function signetContract(wire: string): string {
  const used = new Set<string>();
  for (const tag of ['=', '#', '@', '%', '^', '$', '~']) if (wire.indexOf(tag) !== -1) used.add(tag);
  const rules: string[] = [
    'SG1 exact table: line 2 declares BLOCK,END,FIELD,VALUE,SLOT. A block is BLOCK m FIELD template FIELD column-specs END; split template on SLOT and rebuild m newline-separated rows.',
  ];
  if (used.has('=')) rules.push('=v: constant column v.');
  if (used.has('#')) rules.push('#s,d,w: row r is s+d*r, zero-padded to w.');
  if (used.has('@')) rules.push('@p VALUE values: repeat p-value cycle.');
  if (used.has('%')) rules.push('%s,w VALUE spec: start s then cumulatively add decoded deltas.');
  if (used.has('^')) rules.push('^n VALUE prefix spec: prepend n-char prefix to each decoded value.');
  if (used.has('$')) rules.push('$n VALUE suffix spec: append n-char suffix to each decoded value.');
  if (used.has('~')) rules.push('~values: literal VALUE-separated column.');
  rules.push('Everything else is literal; reconstruction is byte-exact.');
  return rules.join(' ');
}

function helixContract(): string {
  return 'HELIX exact marker ⟐[start,stride,count,width,delimLen]delimiter expands count numbers start+r*stride, zero-padded to width and joined by the next delimLen raw chars; ⟐⟐ is literal ⟐.';
}

function pulseContract(): string {
  return 'P1 exact marker ⟡[count,hex] expands to count copies of UTF-16 code unit hex; ⟡⟡ is literal ⟡; all other text is literal.';
}

function praxisContract(): string {
  return 'PX2 exact dictionary: rows before [/PX2] map one-character alias=phrase; expand aliases bottom-to-top in the body.';
}

function lumenContract(): string {
  return 'KEY exact legend: each row maps one character=phrase; legend ends at the divider line; expand entries bottom-to-top in the following body.';
}

function partitionContract(wire: string, sentinel: '[MZ1]\n' | '[AR1]\n'): string {
  const rest = wire.slice(sentinel.length);
  const sep = rest[0];
  if (!sep || rest[1] !== '\n') return 'Partition wire is malformed; preserve literally.';
  const pieces = rest.slice(2).split(sep).slice(1);
  const contracts = new Map<string, string>();
  for (const piece of pieces) {
    const tag = piece[0];
    const body = piece.slice(1);
    if (tag === 'i') contracts.set('i', 'i: literal region.');
    else if (tag === 'g') contracts.set('g', 'g: ' + signetContract(body));
    else if (tag === 'h') contracts.set('h', 'h: ' + helixContract());
    else if (tag === 'p') contracts.set('p', 'p: ' + pulseContract());
    else if (tag === 'a') contracts.set('a', 'a: ' + anaphoraContract(body));
  }
  return `${sentinel.trim()} exact partition: line 2 is separator S; split following S<tag><region> pieces, decode each by tag, then join regions with newline. ${[...contracts.values()].join(' ')}`;
}

/** Compile the smallest sufficient decoder contract for a concrete wire. */
export function specializeContract(wire: string): string {
  if (wire.startsWith('[MZ1]\n')) return partitionContract(wire, '[MZ1]\n');
  if (wire.startsWith('[AR1]\n')) return partitionContract(wire, '[AR1]\n');
  if (wire.startsWith('[SG1]\n')) return signetContract(wire);
  if (wire.startsWith('[AN1]\n')) return anaphoraContract(wire);
  if (wire.startsWith('[P1]\n')) return pulseContract();
  if (wire.startsWith('[PX2]\n')) return praxisContract();
  if (wire.startsWith('KEY ')) return lumenContract();
  if (wire.indexOf('⟐[') !== -1) return helixContract();
  return '';
}

const cache = new Map<string, IrisResult>();

export async function irisEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<IrisResult> {
  const key = text.length <= 300_000 ? enc + '\u0000' + text : null;
  if (key) {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  const crown: CrownResult = await crownEncodeCached(text, enc);
  const result = irisEncodeFromCrown(text, crown, enc);
  if (key) {
    if (cache.size >= 8) cache.clear();
    cache.set(key, result);
  }
  return result;
}

/** Contract specialization over an already-computed CROWN result. */
export function irisEncodeFromCrown(
  text: string,
  crown: CrownResult,
  enc: EncodingName = 'o200k_base',
): IrisResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const contractPrompt = specializeContract(crown.wire);
  const contractTokens = countTokens(contractPrompt, enc);
  const deliveredTokens = crown.outTokens + contractTokens;
  const result: IrisResult = {
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
    notes: `IRIS specialized CROWN/${crown.member} contract ${crown.contractTokens}→${contractTokens} tokens · delivered ${deliveredTokens} · byte-exact wire unchanged`,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
  return result;
}

export const IRIS_SYSTEM_PROMPT = '◇ IRIS-I1 specializes a decoder contract to the productions used by the concrete exact wire.';
export function irisDecoderPrompt(r?: IrisResult | null): string { return r?.contractPrompt ?? IRIS_SYSTEM_PROMPT; }

export interface IrisSelfTest { name: string; pass: boolean; details: string }
export async function irisSelfTest(enc: EncodingName = 'o200k_base'): Promise<IrisSelfTest[]> {
  const json = Array.from({ length: 40 }, (_, i) => `{"id":${i},"ok":true,"svc":"gateway"}`).join('\n');
  const rle = 'A'.repeat(700) + 'B'.repeat(700);
  const agent = 'The quick brown fox.\n' + json + '\n' + rle;
  const cases = [{ name: 'I0 empty', text: '' }, { name: 'I1 json', text: json }, { name: 'I2 rle', text: rle }, { name: 'I3 agent', text: agent }];
  const out: IrisSelfTest[] = [];
  for (const c of cases) {
    try {
      const crown = await crownEncodeCached(c.text, enc);
      const iris = await irisEncode(c.text, enc);
      out.push({
        name: c.name,
        pass: iris.decoded === c.text && iris.exact && iris.outTokens <= iris.inTokens && iris.deliveredTokens <= crown.deliveredTokens,
        details: `crown delivered=${crown.deliveredTokens} contract=${crown.contractTokens}; iris delivered=${iris.deliveredTokens} contract=${iris.contractTokens}`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }
  return out;
}