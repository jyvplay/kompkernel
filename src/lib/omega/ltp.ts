/**
 * src/lib/omega/ltp.ts
 * =============================================================================
 * LTP — LOSSLESS TOKEN PROJECTION
 *
 * THE REFRAME
 * -----------
 * Every codec in this repository before LTP (Ω-Ξ, SPARROW, STP256, ST12, UC16,
 * Base92) shares one fatal property for the "paste into a web chat UI" use
 * case: the wire is not readable by the model. The model must run a decoder.
 * In a chat UI there is no decoder, and asking the model to decode in-context
 * is economically catastrophic:
 *
 *   reasoning/"thinking" tokens are billed at the OUTPUT rate on OpenAI,
 *   Anthropic and Google, and output is 4-8x the input rate.
 *
 * So decompressing T tokens of content inside the model costs ~T * output_rate,
 * which is 4-8x more than simply sending T tokens as input. Compression that
 * requires in-context decompression is a NET LOSS, always. It moves cheap input
 * tokens into expensive output tokens.
 *
 * LTP inverts the architecture:
 *
 *   - The model NEVER decompresses anything.
 *   - The wire is ordinary, directly-readable text.
 *   - Byte-exactness is a property of YOUR local round trip, not of the wire.
 *   - The residual needed to restore the original byte-for-byte stays on your
 *     machine and is never sent to the model.
 *
 * Therefore:
 *   tokens_sent      = tokens(wire)          <  tokens(original)
 *   tokens_decoded   = 0                     (no CoT decode cost)
 *   byte_exactness   = guaranteed locally    (verified by re-running restore)
 *
 * WHAT IT EXPLOITS
 * ----------------
 * BPE charges real tokens for whitespace. Indentation runs, blank-line runs,
 * trailing spaces and CRLF pairs are semantically inert to a language model but
 * are billed. On indented JSON, YAML, code, logs and markdown tables this is
 * commonly 10-30% of the entire token bill. LTP removes exactly that class of
 * token and records what it removed.
 *
 * SCOPE, STATED HONESTLY
 * ----------------------
 * LTP is not entropy coding. It cannot approach the compression ratio of
 * brotli or CM-Ω on bytes. It is not trying to. It is the only construction
 * here whose savings survive contact with a chat UI, because it is the only one
 * whose output the model can read without a decoder. On flat single-spaced
 * prose it saves close to nothing and correctly falls back to identity.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
/** One reversal instruction. `at` is an offset into the wire. */
export interface LtpOp {
  at: number;
  run: string;
}
export interface LtpResult {
  /** Paste this into the chat UI. Ordinary readable text. */
  wire: string;
  /** Keep this locally. Never sent to the model. */
  residual: LtpOp[];
  /** restore(wire, residual) === input, verified before returning. */
  exact: boolean;
  /** true if the projection was profitable and applied; false = identity. */
  applied: boolean;
  encoding: EncodingName;
  inTokens: number;
  outTokens: number;
  savedTokens: number;
  savingsPct: number;
  inChars: number;
  outChars: number;
  /** approximate local storage cost of the residual, in bytes */
  residualBytes: number;
  opCount: number;
  notes: string;
}
function isWs(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
}
/**
 * Deterministic projection of a single maximal whitespace run.
 * MUST be a pure function of `run` — the decoder recomputes it to learn how
 * many characters to splice out. Changing this function changes the wire
 * format, so it is versioned by LTP_VERSION.
 */
export function projectRun(run: string): string {
  let newlines = 0;
  for (let i = 0; i < run.length; i++) if (run[i] === '\n') newlines++;
  // >=2 newlines is a paragraph/section boundary: preserve one blank line.
  if (newlines >= 2) return '\n\n';
  // Exactly one newline: drop indentation and CR, keep the line break.
  if (newlines === 1) return '\n';
  // Horizontal whitespace only: collapse runs, keep a single separator.
  return run.length > 1 ? ' ' : run;
}
export const LTP_VERSION = 1;
/**
 * Restore the exact original string from a wire plus its residual.
 * Ops are applied in reverse order so earlier offsets stay valid.
 */
export function ltpRestore(wire: string, residual: LtpOp[]): string {
  let out = wire;
  for (let k = residual.length - 1; k >= 0; k--) {
    const op = residual[k];
    const projected = projectRun(op.run);
    if (op.at < 0 || op.at + projected.length > out.length) {
      throw new Error(`ltp: residual op ${k} out of range`);
    }
    out = out.slice(0, op.at) + op.run + out.slice(op.at + projected.length);
  }
  return out;
}
/**
 * Project text to a token-cheaper, still-readable wire.
 * Falls back to identity if the projection does not reduce real tokens or if
 * the round trip is not byte-exact. Never returns an unverified result.
 */
export function ltpProject(text: string, enc: EncodingName): LtpResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): LtpResult => ({
    wire: text,
    residual: [],
    exact: true,
    applied: false,
    encoding: enc,
    inTokens,
    outTokens: inTokens,
    savedTokens: 0,
    savingsPct: 0,
    inChars: text.length,
    outChars: text.length,
    residualBytes: 0,
    opCount: 0,
    notes,
  });
  if (!text) return identity('Empty input; nothing to project.');
  let wire = '';
  const residual: LtpOp[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (isWs(text[i])) {
      let j = i;
      while (j < n && isWs(text[j])) j++;
      const run = text.slice(i, j);
      const projected = projectRun(run);
      if (projected !== run) residual.push({ at: wire.length, run });
      wire += projected;
      i = j;
    } else {
      wire += text[i];
      i += 1;
    }
  }
  // Hard exactness gate. A failure here means a bug, and we must not ship it.
  let restored: string;
  try {
    restored = ltpRestore(wire, residual);
  } catch (error) {
    return identity(`Projection rejected: ${(error as Error).message}`);
  }
  if (restored !== text) {
    return identity('Projection rejected: round trip was not byte-exact.');
  }
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) {
    return identity(
      `Projection declined: wire would cost ${outTokens} tokens vs ${inTokens} for the original. Input has little removable whitespace.`,
    );
  }
  let residualBytes = 0;
  for (const op of residual) residualBytes += op.run.length + 4;
  return {
    wire,
    residual,
    exact: true,
    applied: true,
    encoding: enc,
    inTokens,
    outTokens,
    savedTokens: inTokens - outTokens,
    savingsPct: ((inTokens - outTokens) / inTokens) * 100,
    inChars: text.length,
    outChars: wire.length,
    residualBytes,
    opCount: residual.length,
    notes:
      'Wire is directly readable by any model. Residual is retained locally and is never sent, so no decode tokens are ever billed.',
  };
}
/** Serialize a residual for local persistence (never sent to a model). */
export function serializeResidual(residual: LtpOp[]): string {
  return JSON.stringify({ v: LTP_VERSION, ops: residual });
}
export function deserializeResidual(blob: string): LtpOp[] {
  const parsed = JSON.parse(blob) as { v: number; ops: LtpOp[] };
  if (parsed.v !== LTP_VERSION) throw new Error(`ltp: residual version ${parsed.v} unsupported`);
  return parsed.ops;
}
export interface LtpSelfTest {
  name: string;
  pass: boolean;
  detail: string;
}
export function ltpSelfTest(enc: EncodingName): LtpSelfTest[] {
  const out: LtpSelfTest[] = [];
  const fixtures: [string, string][] = [
    ['empty', ''],
    ['single space', ' '],
    ['single newline', '\n'],
    ['crlf', 'a\r\nb'],
    ['tabs and spaces', 'a\t\t  \tb'],
    ['indented json', '{\n    "a": 1,\n    "b": [\n        2,\n        3\n    ]\n}'],
    ['blank line runs', 'para one\n\n\n\npara two\n\n\n\n\npara three'],
    ['trailing whitespace', 'line one   \nline two\t\t\n'],
    ['leading whitespace', '    indented start'],
    ['unicode + emoji', 'héllo   wörld\n\n\t日本語 🚀🧊'],
    ['all whitespace', ' \t\n\r\n\t '],
    ['no whitespace at all', 'abcdefghijklmnop'],
    ['mixed code block', 'function f() {\n\treturn {\n\t\tok: true\n\t};\n}\n'],
    ['form feed and vtab', 'a\f\vb'],
  ];
  for (const [name, text] of fixtures) {
    try {
      const r = ltpProject(text, enc);
      const back = ltpRestore(r.wire, r.residual);
      const exact = back === text;
      out.push({
        name: `ltp round-trip: ${name}`,
        pass: exact,
        detail: exact
          ? `exact · ${r.inTokens}->${r.outTokens} tok · applied=${r.applied} · ${r.opCount} ops`
          : 'BYTE MISMATCH',
      });
    } catch (error) {
      out.push({ name: `ltp round-trip: ${name}`, pass: false, detail: (error as Error).message });
    }
  }
  // Non-regression: the wire must never cost more tokens than the original.
  try {
    const probe = '{\n    "x": 1,\n    "y": 2\n}';
    const r = ltpProject(probe, enc);
    out.push({
      name: 'ltp never inflates real tokens',
      pass: r.outTokens <= r.inTokens,
      detail: `${r.inTokens} -> ${r.outTokens} tokens`,
    });
  } catch (error) {
    out.push({ name: 'ltp never inflates real tokens', pass: false, detail: (error as Error).message });
  }
  // Residual serialization must survive a persistence cycle.
  try {
    const probe = 'a\n\n\n   b\t\tc\r\nd';
    const r = ltpProject(probe, enc);
    const revived = deserializeResidual(serializeResidual(r.residual));
    out.push({
      name: 'ltp residual serialization is exact',
      pass: ltpRestore(r.wire, revived) === probe,
      detail: `${r.opCount} ops · ${r.residualBytes} bytes stored locally`,
    });
  } catch (error) {
    out.push({ name: 'ltp residual serialization is exact', pass: false, detail: (error as Error).message });
  }
  return out;
}
