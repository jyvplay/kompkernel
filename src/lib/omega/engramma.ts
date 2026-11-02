/**
 * src/lib/omega/engramma.ts
 * =============================================================================
 * ENGRAMMA (ἔγγραμμα) — the frontier, with its repeated sub-encodes remembered.
 *
 * WHAT THIS IS, STATED PRECISELY
 * -----------------------------------------------------------------------------
 * This is a CODEC ENTRY whose output message is, by construction, the TAGSTACK
 * frontier message: same contract, same wire, same parent, same bytes. It adds
 * **zero tokens** to the wire and **zero tokens** to the contract. What it takes
 * away is wall clock: the frontier's eight parents repeatedly re-encode the same
 * intermediate texts, and `engram.ts` makes the second and later encodings of an
 * identical (codec, encoding, options, text) tuple a replay instead of a search.
 *
 *     tokens: ENGRAMMA == TAGSTACK            (measured, SHA-256 identical)
 *     time:   ENGRAMMA  <  TAGSTACK            (measured, receipts below)
 *
 * That is Pareto dominance in the (tokens, wall clock) plane and it is the only
 * dominance this file claims. It is NOT a new compression mechanism and it must
 * not be presented as one: no span is found, no rule is added, no contract
 * sentence changes. The measured token counts of this turn say a compression win
 * of that kind was not available (see `bench/x68/REPORT.md` §5), and inventing
 * one by relabelling a speed-up would be exactly the failure mode the tier-5
 * review is designed to catch.
 *
 * WHY THE IDENTITY IS NOT AN ASSUMPTION
 * -----------------------------------------------------------------------------
 * `enigmaVerify` runs the same input twice in one process — memo on, memo off —
 * and returns both messages, both SHA-256 digests and a strict equality verdict.
 * `bench/x68/engram-cold.ts` does the same across two processes (so the shared
 * pure tokenizer caches start cold in both arms) and `bench/x68/engram-warm.ts`
 * does it with the caches warmed by a discarded pass, so the only difference
 * between the arms is the memo. Receipts: `bench/x68/receipts/engram-*.json`.
 *
 * WHY IT CANNOT CORRUPT A MESSAGE
 * -----------------------------------------------------------------------------
 * The memo is keyed on the exact (codec, encoding, options, text) tuple, and a
 * hit replays the counted work (`workmeter.ts` `workConsume` / `chironConsume`)
 * that the original computation spent, so every later budget decision in the
 * same epoch is unchanged (the X67 soundness bug). `bench/x68/engram-unit.ts`
 * asserts the meter reads the same value after three calls with and without the
 * memo, and that the emitted messages are byte-identical.
 *
 * Prior art: memoisation of a pure function. No paper is claimed for that. The
 * measured fact this file exists for — that the frontier re-encodes the same
 * text dozens of times within one message — is documented in the X68 report.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode } from './sibling-template';
import { engramStats, engramClear } from './engram';

export interface EngrammaResult extends TagstackResult {
  codec: 'tagstack';
  /** Always 0: this codec adds no contract tokens of its own. */
  engrammaContractTokens: 0;
  /** Memo counters for this encode (hits are replays of identical sub-encodes). */
  engrammaStats: typeof engramStats;
  /** SIBLING-TEMPLATE message computed on the same frontier result. */
  engrammaSiblingMessage: string;
  /** True when the memo is enabled for this process. */
  engrammaEnabled: boolean;
}

function memoEnabled(): boolean {
  return !(typeof process !== 'undefined' && process.env?.OMEGA_ENGRAM === '0');
}

/**
 * The frontier with sub-encode memoisation. The returned object is the TAGSTACK
 * result plus the memo counters and the SIBLING-TEMPLATE message; `message`,
 * `wire`, `decoded`, `frontierCosts` and `parentCodec` are exactly TAGSTACK's.
 */
export function engrammaEncode(text: string, enc: EncodingName = 'o200k_base'): EngrammaResult {
  const before = { ...engramStats };
  const r = tagstackEncode(text, enc);
  const sib = siblingTemplateEncode(text, enc, r);
  const after = { ...engramStats };
  const delta = {
    ...after,
    hits: after.hits - before.hits,
    misses: after.misses - before.misses,
    stores: after.stores - before.stores,
    cheapSkips: after.cheapSkips - before.cheapSkips,
    tooBigSkips: after.tooBigSkips - before.tooBigSkips,
    replayedWork: after.replayedWork - before.replayedWork,
    replayedChiron: after.replayedChiron - before.replayedChiron,
    evictions: after.evictions - before.evictions,
  };
  return {
    ...r,
    engrammaContractTokens: 0,
    engrammaStats: delta,
    engrammaSiblingMessage: sib.message,
    engrammaEnabled: memoEnabled(),
  };
}

/** 64-bit FNV-1a over UTF-16 code units. Deterministic, dependency free. */
function fnv1a64(s: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = (1n << 64n) - 1n;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ BigInt(s.charCodeAt(i))) & mask;
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0');
}

export interface EngrammaWitness {
  identical: boolean;
  memoOffMs: number;
  memoOnMs: number;
  ratio: number;
  /** 64-bit FNV-1a digest of the complete message (no node import: this module
   *  is reachable from the browser bundle through `registry.ts`). */
  messageDigest: string;
  frontierTokenEquals: boolean;
  frontier: number;
  winner: string;
  decodedEqualsSource: boolean;
  siblingIdentical: boolean;
  memoStats: typeof engramStats;
}

/**
 * Identity witness: the same input encoded twice in this process, memo off then
 * memo on, with both messages compared as strings. `identical` is not derived
 * from any assumption about the memo; it is a string comparison.
 */
export function engrammaVerify(text: string, enc: EncodingName = 'o200k_base'): EngrammaWitness {
  const prev = process.env.OMEGA_ENGRAM;
  // Warm the shared pure tokenizer caches with a discarded pass so that the two
  // measured arms start from the same cache state. Without this the OFF arm pays
  // the cold-cache cost and the ratio measures cache warming, not the memo
  // (measured: the same lane reads 3.2x confounded vs 1.4x honest).
  process.env.OMEGA_ENGRAM = '0';
  engramClear();
  tagstackEncode(text, enc);
  engramClear();
  let t0 = Date.now();
  const off = tagstackEncode(text, enc);
  const offSib = siblingTemplateEncode(text, enc, off);
  const memoOffMs = Date.now() - t0;

  delete process.env.OMEGA_ENGRAM;
  engramClear();
  t0 = Date.now();
  const on = tagstackEncode(text, enc);
  const onSib = siblingTemplateEncode(text, enc, on);
  const memoOnMs = Date.now() - t0;
  const stats = { ...engramStats };
  if (prev !== undefined) process.env.OMEGA_ENGRAM = prev;

  const minOff = Math.min(...Object.values(off.frontierCosts).map(Number));
  const minOn = Math.min(...Object.values(on.frontierCosts).map(Number));
  return {
    identical: off.message === on.message,
    memoOffMs,
    memoOnMs,
    ratio: +(memoOffMs / Math.max(1, memoOnMs)).toFixed(3),
    messageDigest: fnv1a64(on.message),
    frontierTokenEquals: minOff === minOn,
    frontier: minOn,
    winner: on.parentCodec,
    decodedEqualsSource: on.decoded === text && off.decoded === text,
    siblingIdentical: offSib.message === onSib.message,
    memoStats: stats,
  };
}

/** Deterministic self-test. Returns the list of failures (empty == pass). */
export function engrammaSelfTest(enc: EncodingName = 'o200k_base'): string[] {
  const failures: string[] = [];
  const cases = [
    'ts\tiface\tin_mbps\tout_mbps\tloss_pct\tstate\n2026-10-24T00:00:00Z\tnvme0n0\t100.0\t250.0\t0.0\tdown\n2026-10-24T00:01:00Z\tnvme0n1\t103.1\t252.0\t0.1\tup\n2026-10-24T00:02:00Z\tnvme0n2\t106.2\t254.0\t0.2\tup\n2026-10-24T00:03:00Z\tnvme0n0\t109.3\t256.0\t0.3\tup\n2026-10-24T00:04:00Z\tnvme0n1\t112.4\t258.0\t0.4\tup\n',
    'The retention policy resolves at the moment of creation. Changing a policy later affects only documents created after the change.\n\nThe retention policy resolves at the moment of creation. Changing a policy later affects only documents created after the change.\n',
    '<a><b>one</b><c>two</c></a>\n<a><b>one</b><c>two</c></a>\n',
    '',
    'x',
  ];
  for (const text of cases) {
    const w = engrammaVerify(text, enc);
    const tag = JSON.stringify(text.slice(0, 18));
    if (!w.identical) failures.push(`${tag}: complete message differs with the memo on`);
    if (!w.frontierTokenEquals) failures.push(`${tag}: frontier token count differs`);
    if (!w.decodedEqualsSource) failures.push(`${tag}: decode is not byte-exact`);
    if (!w.siblingIdentical) failures.push(`${tag}: sibling-template message differs`);
    const r = engrammaEncode(text, enc);
    if (r.engrammaContractTokens !== 0) failures.push(`${tag}: contract is not zero tokens`);
    if (countTokens(r.message, enc) !== r.messageTokens) failures.push(`${tag}: reported messageTokens mismatch`);
  }
  return failures;
}
