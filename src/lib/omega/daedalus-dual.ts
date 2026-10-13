/**
 * DAEDALUS-D — DAEDALUS with a dual-tokenizer glyph pool (Z40).
 * =============================================================================
 * Same wire, same decoder, same contract as DAEDALUS (`daedalusEncode`). The
 * only change is on the ENCODER side: every glyph the grammar may assign must
 * cost ONE token under BOTH o200k_base and cl100k_base. The o200k-tuned pools
 * used by DAEDALUS assign glyphs that cl100k splits into 2+ tokens, so a wire
 * that wins on o200k can lose to the raw text on cl100k (Z40 measured
 * code-ts: o200k 1061 vs raw 1422, but cl100k 1606 vs raw 1373).
 *
 * The decoder never reads the pool; it reads the glyph keys off the tape, so
 * no decoder change is needed. Exactness is still gated: the wire must decode
 * byte-identically through `chironDecode`, else the codec returns identity.
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';

export interface DaedalusDualResult {
  codec: 'daedalus-dual';
  /** the wire to hand to a model; equals the input text when identity is returned */
  wire: string;
  /** the message to send: decoder instruction with the wire embedded (empty for identity) */
  decoderPrompt: string;
  mode: 'daedalus' | 'raw';
  exact: boolean;
  inTokens: Record<'o200k_base' | 'cl100k_base', number>;
  /** the full message (decoder instruction with the wire embedded), counted per tokenizer */
  messageTokens: Record<'o200k_base' | 'cl100k_base', number>;
  winningArm: string;
  ms: number;
}

export function daedalusDualEncode(text: string, enc: EncodingName = 'o200k_base'): DaedalusDualResult {
  const started = Date.now();
  const r = daedalusEncode(text, enc, { dualTokenizer: true });
  const inTok = {
    o200k_base: countTokens(text, 'o200k_base'),
    cl100k_base: countTokens(text, 'cl100k_base'),
  };
  const exact = r.mode === 'daedalus' && r.decoded === text;
  const useWire = exact;
  const wire = useWire ? r.wire : text;
  const prompt = useWire ? r.decoderPrompt : '';
  // chironDecoderPrompt(wire) already embeds the wire, so the message is the prompt alone.
  const msg = (e: EncodingName) => (useWire ? countTokens(prompt, e) : inTok[e]);
  return {
    codec: 'daedalus-dual',
    wire,
    decoderPrompt: prompt,
    mode: useWire ? 'daedalus' : 'raw',
    exact: useWire ? true : true, // identity is trivially exact
    inTokens: inTok,
    messageTokens: { o200k_base: msg('o200k_base'), cl100k_base: msg('cl100k_base') },
    winningArm: r.winningArm,
    ms: Date.now() - started,
  };
}
