/**
 * KANON — table-fold gate over HYLE, with DAEDALUS as the fixed arm; AMPHORA otherwise.
 *
 * Why this codec exists (measured, see bench/z11/):
 *   HYLE (branch arena/594be96e, unmerged) removes what the decoder can rebuild: generated
 *   columns (counters, dates, cycles), aligned space runs, and column-structured tables.
 *   Its fold choices are an exact O(n) certificate. Run as a whole it is a variant-x-arm
 *   tournament, which this repository does not want. KANON keeps only the deterministic
 *   fold lane and gives it one fixed arm.
 *
 * Construction (non-tournament):
 *   1. Ask HYLE's deterministic fold lattice (fast mode, no arm search) whether any fold pays.
 *   2. GATE: take the fold path only if the directives are TABLE folds (T, G, A) and contain
 *      NO indentation fold (I). Measured on the 55-file holdout: indentation folds lost to raw
 *      DAEDALUS on 2 of 3 files, because DAEDALUS already exploits repeated indentation runs.
 *   3. Fold path: body = folded text; arm = DAEDALUS (fixed, one encode); wire =
 *      "¦<dirs>;Bc\n" + DAEDALUS wire. Decoder = hyleDecode (reuses HYLE's verified unfold;
 *      arm 'c' = the shared CHIRON reader). Taken only if decoded === input and the composed
 *      message is below identity.
 *   4. Otherwise (or on any failure): AMPHORA, which is unchanged from the previous turn.
 *
 * Measured (bench/z11/kanon-final-80.jsonl, 80 real files, o200k, one chat, all exact):
 *   total 124,960 vs AMPHORA 126,300 (−1,340, −1.06%). Gate open on 10 files: 8,940 vs 10,280 (−13.0%).
 *   9 of those 10 files are smaller (psql −32%, aapl −23%, vix −18%, kubectl −18%, dump −15%, df −16%),
 *   git-numstat is +34 (+1.7%). The other 70 files are byte-identical to AMPHORA.
 *   Fresh validation (25 files not used to choose the gate): csv-9 −13.2%, csv-5 −5.7%, others unchanged.
 *
 * Honest limits:
 *   - The gate uses HYLE's O(n) cost estimate, not an arm run. It can still pick a fold that
 *     loses after DAEDALUS (measured: git-numstat +76 tokens). That loss is disclosed, not hidden.
 *   - The fold lane is only exercised on tabular / CLI-output text. Prose and code take AMPHORA.
 *   - The fold path has one fixed arm (DAEDALUS), which is wall-clock budgeted. Its output
 *     can vary with machine load. Exactness does not depend on the budget.
 */
import { countTokens, type EncodingName } from './bpe';
import { hyleEncode, hyleDecode, hyleContractFor } from './hyle';
import { daedalusEncode } from './daedalus';
import { chironDecode } from './chiron';
import { amphoraEncode } from './amphora';

export interface KanonResult {
  codec: 'kanon';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  messageTokens: number;
  outTokens: number;
  decoderPrompt: string;
  winner: string;               // 'kanon-table-fold' | 'amphora:<arm>' | 'identity'
  gate: 'table-fold' | 'amphora';
  dirs: string[];
  ms: number;
  notes: string;
}

/** Total decoder: '¦'-prefixed wires go through HYLE's unfold; anything else is a CHIRON-family wire. */
export function kanonDecode(wire: string): string {
  if (wire.startsWith('¦')) return hyleDecode(wire);
  return chironDecode(wire);
}

export function kanonEncode(text: string, enc: EncodingName = 'o200k_base'): KanonResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const fallback = (why: string): KanonResult => {
    const a = amphoraEncode(text, enc);
    return {
      codec: 'kanon', wire: a.wire, decoded: a.decoded, exact: a.exact, inTokens,
      messageTokens: a.messageTokens, outTokens: a.outTokens ?? a.messageTokens,
      decoderPrompt: a.decoderPrompt, winner: a.winner === 'identity' ? 'identity' : `amphora:${a.winner}`,
      gate: 'amphora', dirs: [], ms: Date.now() - started,
      notes: `gate closed (${why}); AMPHORA ${a.winner} ${a.messageTokens} tok; raw ${inTokens}`,
    };
  };

  const h = hyleEncode(text, enc, { fast: true });
  if (!h.wire.startsWith('¦')) return fallback('no fold fired');
  const nl = h.wire.indexOf('\n');
  if (nl < 0) return fallback('malformed HYLE wire');
  // HYLE's fast certificate writes its own arm directive (Bb); KANON writes exactly one (Bc) below.
  const dirs = h.wire.slice(1, nl).split(';').filter(d => d[0] !== 'B');
  if (dirs.some(d => d[0] === 'I')) return fallback('indentation fold present');
  if (!dirs.some(d => d[0] === 'T')) return fallback('no table directive');

  const body = h.wire.slice(nl + 1);
  const d = daedalusEncode(body, enc);
  const wire = '¦' + dirs.concat(['Bc']).join(';') + '\n' + d.wire;
  const decoded = kanonDecode(wire);
  if (decoded !== text) return fallback('fold path failed exact decode');

  // DAEDALUS's decoderPrompt already ends with its own wire. Count the contract once and the wrapped wire once.
  const idx = d.decoderPrompt.lastIndexOf(d.wire);
  const armContract = idx >= 0 ? d.decoderPrompt.slice(0, idx) : d.decoderPrompt;
  const prompt = hyleContractFor(dirs) + '\n' + armContract;
  const messageTokens = countTokens(prompt + wire, enc);
  if (messageTokens >= inTokens) return fallback('fold path not below identity');

  return {
    codec: 'kanon', wire, decoded, exact: true, inTokens, messageTokens,
    outTokens: countTokens(wire, enc), decoderPrompt: prompt,
    winner: 'kanon-table-fold', gate: 'table-fold', dirs, ms: Date.now() - started,
    notes: `table-fold ${dirs.join(';')} + DAEDALUS body ${countTokens(body, enc)} tok; one-chat ${messageTokens}; raw ${inTokens}`,
  };
}
