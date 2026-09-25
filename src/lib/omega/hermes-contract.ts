/**
 * HERMES-C: contract-sliced HERMES-F delivery.
 *
 * HERMES-F already carries a dynamic template program. HERMES-C adds a
 * separately inspectable compiler boundary: it specializes the decoder
 * contract against the finished wire and exposes the exact operation set and
 * token accounting needed for one ordinary chat message. No dictionary,
 * fixed schema, system prompt, tool, or prior state is involved.
 *
 * This module intentionally delegates wire construction and exact decoding to
 * HERMES-F; the new mechanism is the wire-dependent contract, not a second
 * hidden wire language. Keeping the boundary explicit makes it testable and
 * prevents a UI from accidentally reporting wire-only savings as chat savings.
 */
import { countTokens, type EncodingName } from './bpe';
import {
  hermesFractalDecode,
  hermesFractalDecoderPrompt,
  hermesFractalEncode,
  type HermesFractalResult,
  HERMES_F_START,
} from './hermes-fractal';

export type HermesContractOperation = 'T' | 'B' | 'R' | '=' | '#' | '%' | '~';

export interface HermesContractResult extends HermesFractalResult {
  codec: 'hermes-c';
  decoderPrompt: string;
  contractTokens: number;
  operations: HermesContractOperation[];
  oneChatTokens: number;
}

function operationsIn(wire: string): HermesContractOperation[] {
  const found = new Set<HermesContractOperation>();
  if (!wire.startsWith(`${HERMES_F_START}\n`)) return [];
  for (const line of wire.slice(`${HERMES_F_START}\n`.length).split('\n')) {
    if (line.startsWith('T\t')) {
      found.add('T');
      try {
        const specs = JSON.parse(line.split('\t')[3]) as unknown;
        if (Array.isArray(specs)) {
          for (const value of specs) {
            if (typeof value === 'string' && value.length > 0 && '= #%~'.includes(value[0])) {
              found.add(value[0] as HermesContractOperation);
            }
          }
        }
      } catch { /* the exact decoder, not metadata, owns malformed-wire behavior */ }
    } else if (line.startsWith('B\t')) found.add('B');
    else if (line.startsWith('R\t')) found.add('R');
  }
  return (['T', 'B', 'R', '=', '#', '%', '~'] as HermesContractOperation[]).filter(op => found.has(op));
}

export function hermesContractEncode(text: string, enc: EncodingName = 'o200k_base'): HermesContractResult {
  const base = hermesFractalEncode(text, enc);
  // Identity is already a valid one-message delivery; do not manufacture a
  // decoder contract for it. Forced frame wrappers still receive the exact
  // framed contract because their wire really is a program.
  const decoderPrompt = base.mode === 'raw' ? base.wire : hermesFractalDecoderPrompt(base.wire);
  const contractTokens = base.mode === 'raw' ? 0 : countTokens(decoderPrompt, enc) - countTokens(base.wire, enc);
  const oneChatTokens = base.mode === 'raw' ? base.outTokens : countTokens(decoderPrompt, enc);
  return {
    ...base,
    codec: 'hermes-c',
    decoderPrompt,
    contractTokens,
    operations: operationsIn(base.wire),
    oneChatTokens,
    messageTokens: oneChatTokens,
    notes: `${base.notes}; contract-sliced operations=${operationsIn(base.wire).join(',') || 'identity'}; decoder contract=${contractTokens} tokens`,
  };
}

export function hermesContractDecode(wire: string): string {
  return hermesFractalDecode(wire);
}
