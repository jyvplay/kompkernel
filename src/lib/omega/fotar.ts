/**
 * FOTAR — frequency-ordered in-band token aliases (X65).
 *
 * This is a readable, exact adaptation of token-frequency dictionary coding:
 * repeat BPE-token surface fragments are replaced by local aliases and the
 * literal alias table is carried in the same message. Unlike FOT's binary
 * rank stream, the receiver needs only the in-band table and its explicit
 * substitution rule. This is a codec candidate, not a global novelty claim;
 * generic phrase dictionaries are close existing stack/prior art.
 */
import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { apographeDecodeResult, apographeEncode } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';

export const FOTAR_MAX_SOURCE_CHARS = 80_000;
export const FOTAR_MAX_DICTIONARY_ENTRIES = 96;
const MARKERS = ['⟦F', '‹F', '§F', '¤F', '¦F', '⟬F'];

export interface FotarEntry { marker: string; surface: string; frequency: number }
export interface FotarPlan { source: string; mapped: string; entries: FotarEntry[]; exact: boolean; directMessageTokens: number }
export interface FotarResult extends TagstackResult {
  fotar: boolean;
  candidateTokens: number | null;
  candidateExact: boolean | null;
}

export function fotarContract(): string {
  return 'FOTAR-1: the next line beginning TABLE: is a JSON array of [alias,literal-surface] pairs. Decode the remaining self-contained parent message to obtain DATA. Scan DATA left-to-right; replace each exact listed alias with its literal surface, using the longest listed alias at each position. Copy every other character unchanged. Do not normalize whitespace, Unicode, or line endings.';
}

function chooseMarkers(source: string, count: number): string[] | null {
  for (const stem of MARKERS) {
    const markers = Array.from({ length: count }, (_, i) => `${stem}${i.toString(36)}⟧`);
    if (markers.every((m) => !source.includes(m))) return markers;
  }
  return null;
}

function makeMapped(tokens: { id: number; s: string }[], selected: Map<string, string>): string {
  let out = '';
  for (const token of tokens) out += selected.get(token.s) ?? token.s;
  return out;
}

/** Exact, bounded deterministic greedy plan. No external state enters the wire. */
export function fotarPlan(text: string, enc: EncodingName = 'o200k_base'): FotarPlan | null {
  if (!text || text.length > FOTAR_MAX_SOURCE_CHARS) return null;
  const tokens = tokenStrings(text, enc);
  if (tokens.map((t) => t.s).join('') !== text) return null;
  const frequencies = new Map<string, number>();
  for (const t of tokens) if (t.s.length > 1) frequencies.set(t.s, (frequencies.get(t.s) ?? 0) + 1);
  const candidates = [...frequencies.entries()]
    .filter(([surface, n]) => n >= 2 && (n - 1) * surface.length - 5 * n - 12 > 0)
    .sort((a, b) => ((b[1] - 1) * b[0].length - 5 * b[1]) - ((a[1] - 1) * a[0].length - 5 * a[1]) || b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, FOTAR_MAX_DICTIONARY_ENTRIES);
  if (!candidates.length) return null;
  const markers = chooseMarkers(text, candidates.length);
  if (!markers) return null;
  const contract = fotarContract();
  const selected = new Map<string, string>();
  const entries: FotarEntry[] = [];
  const render = (): { mapped: string; directMessageTokens: number } => {
    const mapped = makeMapped(tokens, selected);
    const table = JSON.stringify(entries.map(({ marker, surface }) => [marker, surface]));
    const message = `${contract}\nTABLE:${table}\nDATA:${mapped}`;
    return { mapped, directMessageTokens: countTokens(message, enc) };
  };
  // Greedy deterministic admissions by estimated character mass. This proxy
  // only plans; the final full-message token gate decides whether anything ships.
  // Admit the entire ordered candidate set first, then tokenize the final render
  // once: intermediate renders cannot change the fixed admission order or result.
  for (let i = 0; i < candidates.length; i++) {
    const [surface, frequency] = candidates[i];
    const marker = markers[i];
    selected.set(surface, marker);
    entries.push({ marker, surface, frequency });
  }
  if (!entries.length) return null;
  const best = render();
  const decoded = fotarDecode(best.mapped, entries);
  if (decoded !== text) return null;
  return { source: text, mapped: best.mapped, entries: entries.map((e) => ({ ...e })), exact: true,
    directMessageTokens: best.directMessageTokens };
}

/** Parse the exact two-line FOTAR envelope and return the parent message/table. */
export function fotarParseEnvelope(message: string): { tableJson: string; parentMessage: string } | null {
  const firstBreak = message.indexOf('\n');
  if (firstBreak < 0 || message.slice(0, firstBreak) !== fotarContract()) return null;
  const secondBreak = message.indexOf('\n', firstBreak + 1);
  if (secondBreak < 0) return null;
  const tableLine = message.slice(firstBreak + 1, secondBreak);
  if (!tableLine.startsWith('TABLE:')) return null;
  const tableJson = tableLine.slice('TABLE:'.length);
  try {
    const parsed: unknown = JSON.parse(tableJson);
    if (!Array.isArray(parsed) || parsed.some((row) => !Array.isArray(row) || row.length !== 2 ||
      typeof row[0] !== 'string' || typeof row[1] !== 'string')) return null;
  } catch { return null; }
  return { tableJson, parentMessage: message.slice(secondBreak + 1) };
}

/** Decode directly from the serialized in-band table, not encoder-side metadata. */
export function fotarDecodeWithTable(mapped: string, tableJson: string): string {
  const parsed: unknown = JSON.parse(tableJson);
  if (!Array.isArray(parsed)) throw new Error('invalid FOTAR JSON table');
  const entries: FotarEntry[] = parsed.map((row) => {
    if (!Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string' || typeof row[1] !== 'string')
      throw new Error('invalid FOTAR table row');
    return { marker: row[0], surface: row[1], frequency: 0 };
  });
  return fotarDecode(mapped, entries);
}

/** Apply the serialized envelope's table to an already decoded parent payload. */
export function fotarDecodeEnvelope(message: string, decodedParent: string): string | null {
  const envelope = fotarParseEnvelope(message);
  return envelope ? fotarDecodeWithTable(decodedParent, envelope.tableJson) : null;
}

/** Pure in-band table inverse, used by tests and by the composed encoder. */
export function fotarDecode(mapped: string, entries: FotarEntry[]): string {
  const byMarker = new Map(entries.map((e) => [e.marker, e.surface]));
  if (byMarker.size !== entries.length || entries.some((e) => !e.marker || !e.marker.endsWith('⟧'))) throw new Error('invalid FOTAR table');
  const markers = [...byMarker.keys()].sort((a, b) => b.length - a.length);
  let out = '';
  for (let i = 0; i < mapped.length;) {
    const marker = markers.find((m) => mapped.startsWith(m, i));
    if (marker) { out += byMarker.get(marker)!; i += marker.length; }
    else out += mapped[i++];
  }
  return out;
}

function cloneResult(r: TagstackResult, ms = r.ms): TagstackResult {
  return { ...r, ms, frontierCosts: { ...r.frontierCosts }, frontierReportedCosts: { ...r.frontierReportedCosts } };
}

/**
 * Compose FOTAR -> APOGRAPHE and compare the complete message against the
 * exact same-source TAGSTACK+SIBLING frontier. Any failure returns that parent.
 */
export function fotarEncode(text: string, enc: EncodingName = 'o200k_base'): FotarResult {
  const started = Date.now();
  const baseline = tagstackEncode(text, enc);
  const fallback = (notes: string, candidateTokens: number | null = null,
    candidateExact: boolean | null = null, candidateMessage: string | null = null): FotarResult => ({ ...cloneResult(baseline, Date.now() - started),
      fotar: false, candidateMessage, candidateTokens, candidateExact,
      notes: `${notes}; fallback=${baseline.parentCodec}:${baseline.messageTokens}` });
  if (!baseline.exact || !baseline.frontierComplete) return fallback('source parent gate incomplete');
  const plan = fotarPlan(text, enc);
  if (!plan) return fallback('no profitable exact token-alias plan');
  let child;
  try { child = apographeEncode(plan.mapped, enc); }
  catch { return fallback('APOGRAPHE encode failed'); }
  let parentDecoded: string;
  try { parentDecoded = apographeDecodeResult(child); }
  catch { return fallback('APOGRAPHE decode failed'); }
  const table = JSON.stringify(plan.entries.map(({ marker, surface }) => [marker, surface]));
  const childMessage = (child.contract ? `${child.contract}\n` : '') + child.wire;
  const candidateMessage = `${fotarContract()}\nTABLE:${table}\n${childMessage}`;
  const envelope = fotarParseEnvelope(candidateMessage);
  const decoded = fotarDecodeEnvelope(candidateMessage, parentDecoded) ?? '';
  const candidateExact = !!envelope && envelope.parentMessage === childMessage &&
    parentDecoded === plan.mapped && decoded === text;
  const candidateTokens = countTokens(candidateMessage, enc);
  if (!candidateExact) return fallback('composed decoder failed exactness', candidateTokens, false, candidateMessage);
  if (candidateTokens >= baseline.messageTokens) return fallback(`candidate M=${candidateTokens} >= source frontier M=${baseline.messageTokens}`, candidateTokens, true, candidateMessage);
  return { ...baseline, codec: 'tagstack', wire: child.wire, message: candidateMessage, decoded, exact: true,
    messageTokens: candidateTokens, applied: true, arm: 'tagstack', candidateTokens, candidateExact: true,
    candidateMessage, notes: `FOTAR accepted: ${plan.entries.length} aliases, M=${candidateTokens} < ${baseline.parentCodec} frontier M=${baseline.messageTokens}`,
    ms: Date.now() - started, fotar: true };
}
