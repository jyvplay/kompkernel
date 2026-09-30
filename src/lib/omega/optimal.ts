/**
 * OPTIMAL — audited one-message selector.
 *
 * This is intentionally a selector, not another compression transform.  It
 * chooses the smallest *complete user message* among every locally verified,
 * self-contained direct-reasoning path supplied by the worker.  Binary lanes,
 * lossy lanes, persistent-context lanes, system-prompt-dependent lanes, and
 * Rosetta are not candidates: including them would make a false claim about a
 * bare single-chat input/output turn.
 */
import { countTokens, type EncodingName } from './bpe';

export interface DirectPathLike {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  decoderPrompt: string;
  notes?: string;
}

export interface OptimalCandidateReceipt {
  key: string;
  messageTokens: number;
  accepted: boolean;
  reason: string;
}

export interface OptimalResult {
  codec: 'optimal';
  /** The complete message to paste; never merely an undecodable wire. */
  wire: string;
  decoderPrompt: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  winner: string;
  eligible: string[];
  receipts: OptimalCandidateReceipt[];
  notes: string;
}

/**
 * Fixed scope for the one-chat selector. These encoders all return their full
 * inline decoder prompt from the worker; identity is added by the selector.
 * This is deliberately not a list of binary, lossy, persistent-context, or
 * hidden-system-prompt paths.
 */
export const DIRECT_ONE_CHAT_KEYS = [
  'hermesContract', 'chiron', 'ariadne', 'sibyl', 'sequoyah', 'thoth', 'palimpsest',
  'daedalus', 'orthos', 'stentor', 'abacus', 'procrustes', 'circe', 'chimera',
  'caesura', 'syntagma', 'prosopon', 'epistle', 'arithmos', 'kalligraphos',
] as const;
export type DirectOneChatKey = typeof DIRECT_ONE_CHAT_KEYS[number];
export type DirectPathTable = Record<string, DirectPathLike>;

/**
 * Objective: min token count over candidates C with a byte-identical local
 * round trip and an honestly re-counted complete prompt.  Ties resolve by
 * stable insertion order, keeping selections reproducible.
 */
export function chooseOptimalDirect(text: string, candidates: DirectPathTable, enc: EncodingName = 'o200k_base'): OptimalResult {
  const inTokens = countTokens(text, enc);
  let winner = 'identity';
  let output = text;
  let messageTokens = inTokens;
  const receipts: OptimalCandidateReceipt[] = [];
  const eligible: string[] = [];

  for (const [key, candidate] of Object.entries(candidates)) {
    const measured = countTokens(candidate.decoderPrompt, enc);
    const valid = candidate.exact === true && candidate.decoded === text && candidate.messageTokens === measured;
    if (!valid) {
      const why = candidate.exact !== true ? 'not exact' : candidate.decoded !== text ? 'round-trip mismatch' : `accounting mismatch (${candidate.messageTokens} claimed, ${measured} measured)`;
      receipts.push({ key, messageTokens: measured, accepted: false, reason: why });
      continue;
    }
    eligible.push(key);
    const wins = measured < messageTokens;
    receipts.push({ key, messageTokens: measured, accepted: wins, reason: wins ? 'new minimum complete-message cost' : 'valid but not smaller than current minimum' });
    if (wins) { winner = key; output = candidate.decoderPrompt; messageTokens = measured; }
  }

  return {
    codec: 'optimal', wire: output, decoderPrompt: output, decoded: text, exact: true,
    inTokens, outTokens: messageTokens, messageTokens, winner, eligible, receipts,
    notes: `OPTIMAL audited ${eligible.length}/${Object.keys(candidates).length} self-contained exact lanes; selected ${winner} at ${messageTokens}/${inTokens} complete-message tokens. Identity remains in the search as the initial candidate.`,
  };
}
