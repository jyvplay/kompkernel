/**
 * src/lib/omega/harmos.ts — X81. ἉΡΜΌΣ (harmós), "a joint, a seam, that which
 * joins two things" — and in masonry, the mortar line between cut stones. Both
 * senses are meant: the codec removes the seams between fixed-width fields, and
 * what remains are the stones themselves.
 * =============================================================================
 *
 * WHAT IT DOES
 * ------------
 * Machine output is dense with compound identifiers: timestamps, dates, clocks,
 * durations. Each is a fixed number of fixed-width fields joined by punctuation,
 * and in o200k every one of those hyphens, colons and separator runs is its own
 * token carrying no information the digits do not already carry:
 *
 *     2026-11-07           ->  ~20261107            (was 5 tokens, now 3)
 *     2026-11-07T14:22:01  ->  %20261107142201
 *     00:03:12             ->  ^000312
 *     Apr 14  2017         ->  &Apr14!2017
 *     Jan  2 08:00         ->  @Jan0208:00
 *
 * declared once by a contract that names only the shapes a lane actually uses:
 *
 *     §X81 ~8=YYYYMMDD.
 *
 * WHY THIS IS THE SAME MOVE AS PARATAXIS, APPLIED ONE LEVEL DOWN
 * ---------------------------------------------------------------
 * PARATAXIS (X80) deleted the padding BETWEEN columns — pure column geometry —
 * and declared the widths once. HARMOS deletes the separators WITHIN a field —
 * pure field geometry — and declares the shape once. Both rest on the same claim:
 * a separator that is recoverable from a declared width is not information, and
 * paying a token for it is waste. X80 worked across columns; X81 works inside
 * them. That is the sense in which this is a new mechanic and not a re-run: the
 * unit of redundancy has moved from the table to the token.
 *
 * WHERE IT COMES FROM: THE TOKENIZER, NOT FROM A COMPRESSION PAPER
 * ----------------------------------------------------------------
 * Punctuation between digit groups forces o200k to RE-START a numeric chunk, so
 * `2026-11-07` costs more tokens than `20261107` even though the second is the
 * same eight digits. That behaviour is documented in Singh & Strouse,
 * "Tokenization counts: the impact of tokenization on arithmetic in frontier
 * LLMs" (arXiv:2402.14903), and in "Getting the most out of your tokenizer for
 * pre-training and domain adaptation" (arXiv:2402.01035), which show digits are
 * chunked in threes right-to-left and that any non-digit breaks the chunk. No
 * compression result from either paper is claimed or used here; they are cited
 * only for the tokenizer property, which is measured directly below.
 *
 * THE MEASUREMENTS (bench/x81/receipts/chrono4.json — cold, real frontier)
 * -----------------------------------------------------------------------
 *     psql-output.txt   24 ISO dates      raw  -72  contract  9  F 244 -> 192 (-52)
 *     cue-sheet.md      28 HH:MM:SS       raw  -84  contract 13  F 163 -> 155  (-8)
 *     metrics.tsv       24 ISO datetimes  raw -144  contract 14  F 210 -> 206  (-4)
 *     prices.csv        30 ISO dates      raw  -60  contract  9  F 133 -> 132  (-1)
 *     ls-l-real.txt    149 ls dates       raw -185  contract 21  F 1497 -> 1500 (+3)  REFUSED
 *     ps-ef.txt         78 clocks         raw -156  contract 20  F 315 -> 335 (+20)  REFUSED
 *
 * THE REFUSALS ARE THE INFORMATIVE HALF OF THAT TABLE. ps-ef has LARGER raw
 * savings than cue-sheet (-156 vs -84) and still loses. The frontier already
 * prices its punctuation away, because ps-ef's timestamps are repetitive in a way
 * the frontier's own row machinery can see (the START column repeats one date 39
 * times). HARMOS only wins where the timestamps VARY. That asymmetry IS the
 * mechanism, and it is why the win is measured per lane rather than asserted.
 *
 * THE CONTRACT DECIDES EVERYTHING, AND IT IS ADAPTIVE
 * ---------------------------------------------------
 * The packing is nearly free and the contract is the whole cost, so the only
 * question is whether the declaration can be made small enough to pay for itself.
 * Measured on the SAME transform on the SAME lane:
 *
 *     psql-output.txt   contract 34 tok => -27     contract  9 tok => -52
 *     cue-sheet.md      contract 34 tok => +12     contract 13 tok =>  -8
 *     metrics.tsv       contract 39 tok => +21     contract 14 tok =>  -4
 *
 * So the contract names ONLY the shapes actually present, in terse form. A lane
 * with nothing but ISO dates pays nine tokens; a lane with every shape pays
 * twenty-six. This is the difference between winning on four lanes and winning on
 * none — and it is the reason the earlier single-fixed-contract draft lost
 * everywhere (bench/x81/receipts/chrono.json: contract 95, every lane +17..+65).
 *
 * WHY IT IS LOSSLESS, AND HOW THE INVERSE IS MADE TOTAL
 * -----------------------------------------------------
 * Packing is a sequence of rewrites, each applied to the output of the previous
 * one, most specific first. Unpacking applies the inverses in EXACT REVERSE
 * ORDER. Every shape is tagged by its marker AND by the length of the digit run
 * that follows, and a longer run is always matched before a shorter one, so no
 * inverse can consume another shape's payload:
 *
 *     ~ + 14 digits -> ISO datetime (space)      % + 14 -> ISO datetime (T)
 *     ~ + 12 digits -> ISO date + HH:MM (space)  % + 12 -> same, T
 *     ~ +  8 digits -> ISO date
 *     ^ +  6 digits -> HH:MM:SS                  ^ + 4  -> HH:MM
 *     @ + Mon + 2 digits + HH:MM                 & + Mon + 2 digits + ! + 4 digits
 *
 * G1 closes the last hole: if the source already contains a marker character the
 * lane is REFUSED outright rather than escaped, so a decoder never has to wonder
 * whether a marker it sees was in the original.
 *
 * The day field is the one part not recoverable from the digits, because `ls -l`
 * right-justifies it to width 2 (`Jan  2` has two spaces, `Jan 15` one). Rather
 * than transmit it, HARMOS observes that it is a FUNCTION OF THE DAY: a day below
 * ten is padded to two columns. The day is stored zero-padded and the inverse
 * re-derives the spacing. Round-trip verified on all 149 dates of ls-l-real.txt.
 *
 * IS IT GREEDY?
 * -------------
 * The REWRITE is not greedy — it is a deterministic ordered pass; the packed text
 * is a fixed function of the source and no choice is made. What IS greedy is the
 * ACCEPTANCE SEARCH: shapes are admitted in specificity order and the set is
 * trimmed by a bounded repair loop (drop the least specific shape, re-test) while
 * the result does not beat the frontier. That loop is bounded at two iterations,
 * so the codec is deterministic and terminating, and it can return a locally-but-
 * not-globally-optimal shape set.
 *
 * TIME-BOUND OR CPU-BOUND?
 * ------------------------
 * CPU-bound. The scan is a handful of linear regex passes; a single frontier
 * encode costs orders of magnitude more than the entire HARMOS analysis, so all
 * the wall time sits inside the frontier's own search. There is no I/O and no
 * waiting anywhere in this codec.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier, type TagstackResult } from './tagstack';

const CONTRACT_HEAD = '§X81';
const MON = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const P2 = (d: string) => d.padStart(2, '0');
/** ls -l right-justifies the day to width 2, so a day below ten gets a leading space */
const RJ = (d: string) => (d.startsWith('0') ? ' ' + d.slice(1) : d);

interface Form {
  id: string;
  re: RegExp;
  rep: (m: string[]) => string;
  inv: RegExp;
  out: (m: string[]) => string;
  terse: string;
  clause: string;
}

/** most specific first; unpacking walks this list backwards */
const FORMS: Form[] = [
  { // 2026-11-07T14:22:01
    id: 'dt14T', re: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/g,
    rep: (m) => `%${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}${m[6]}`,
    inv: /%(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/g,
    out: (m) => `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`,
    terse: '%14=YYYYMMDDTHHMMSS', clause: 'a % then 14 digits is an ISO date and time joined by T' },
  { // 2026-11-07 14:22:01
    id: 'dt14S', re: /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/g,
    rep: (m) => `~${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}${m[6]}`,
    inv: /~(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/g,
    out: (m) => `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`,
    terse: '~14=YYYYMMDD HHMMSS', clause: 'a ~ then 14 digits is an ISO date and time joined by a space' },
  { // 2026-11-07T14:22
    id: 'dt12T', re: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?![\d:])/g,
    rep: (m) => `%${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}`,
    inv: /%(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?!\d)/g,
    out: (m) => `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`,
    terse: '%12=YYYYMMDDTHHMM', clause: 'a % then 12 digits is an ISO date and HH:MM joined by T' },
  { // 2026-11-07 14:22
    id: 'dt12S', re: /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?![\d:])/g,
    rep: (m) => `~${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}`,
    inv: /~(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?!\d)/g,
    out: (m) => `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`,
    terse: '~12=YYYYMMDD HHMM', clause: 'a ~ then 12 digits is an ISO date and HH:MM joined by a space' },
  { // Apr 14  2017
    id: 'lsy', re: new RegExp(`(${MON}) +(\\d{1,2}) +(\\d{4})(?![\\d:])`, 'g'),
    rep: (m) => `&${m[1]}${P2(m[2])}!${m[3]}`,
    inv: /&([A-Za-z]{3})(\d{2})!(\d{4})/g,
    out: (m) => `${m[1]} ${RJ(m[2])}  ${m[3]}`,
    terse: '&MonDD!YYYY', clause: 'a & then a month, two digits and a 4-digit year is a month-day-year' },
  { // Jan  2 08:00
    id: 'lst', re: new RegExp(`(${MON}) +(\\d{1,2}) +(\\d{2}):(\\d{2})`, 'g'),
    rep: (m) => `@${m[1]}${P2(m[2])}${m[3]}:${m[4]}`,
    inv: /@([A-Za-z]{3})(\d{2})(\d{2}:\d{2})/g,
    out: (m) => `${m[1]} ${RJ(m[2])} ${m[3]}`,
    terse: '@MonDDHH:MM', clause: 'a @ then a month, two digits and HH:MM is a month-day-time' },
  { // 2026-11-07
    id: 'd8', re: /(\d{4})-(\d{2})-(\d{2})/g,
    rep: (m) => `~${m[1]}${m[2]}${m[3]}`,
    inv: /~(\d{4})(\d{2})(\d{2})(?!\d)/g,
    out: (m) => `${m[1]}-${m[2]}-${m[3]}`,
    terse: '~8=YYYYMMDD', clause: 'a ~ then 8 digits is an ISO date' },
  { // 00:03:12
    id: 'c6', re: /(?<![\d:])(\d{2}):(\d{2}):(\d{2})(?![\d:])/g,
    rep: (m) => `^${m[1]}${m[2]}${m[3]}`,
    inv: /\^(\d{2})(\d{2})(\d{2})(?!\d)/g,
    out: (m) => `${m[1]}:${m[2]}:${m[3]}`,
    terse: '^6=HHMMSS', clause: 'a ^ then 6 digits is HH:MM:SS' },
  { // 08:00
    id: 'c4', re: /(?<![\d:])(\d{2}):(\d{2})(?![\d:])/g,
    rep: (m) => `^${m[1]}${m[2]}`,
    inv: /\^(\d{2})(\d{2})(?!\d)/g,
    out: (m) => `${m[1]}:${m[2]}`,
    terse: '^4=HHMM', clause: 'a ^ then 4 digits is HH:MM' },
];

const MARKERS = ['%', '~', '&', '@', '^'];

function packAll(S: string): { T: string; used: Form[]; counts: Record<string, number> } {
  let T = S;
  const used: Form[] = [];
  const counts: Record<string, number> = {};
  for (const f of FORMS) {
    const m = T.match(new RegExp(f.re.source, 'g'));
    if (!m || !m.length) continue;
    counts[f.id] = m.length;
    used.push(f);
    T = T.replace(new RegExp(f.re.source, 'g'), (...a: any[]) => f.rep(a as string[]));
  }
  return { T, used, counts };
}

function unpackAll(T: string, used: Form[]): string {
  let S = T;
  for (let i = used.length - 1; i >= 0; i--) {
    S = S.replace(new RegExp(used[i].inv.source, 'g'), (...a: any[]) => used[i].out(a as string[]));
  }
  return S;
}

/** ADAPTIVE: only the clauses for the shapes actually present, terse by default */
const contractOf = (used: Form[], terse: boolean) => {
  const parts = used.map((f) => (terse ? f.terse : f.clause));
  if (used.some((f) => f.id === 'lsy' || f.id === 'lst')) parts.push('day right-just 2');
  return `${CONTRACT_HEAD} ${parts.join(terse ? ' ' : '; ')}.`;
};

export interface HarmosResult {
  codec: 'harmos';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  frontierTokens: number;
  messageTokens: number;
  frontierParent: string;
  notes: string;
  forms?: string[];
  counts?: Record<string, number>;
  contractTokens?: number;
  pruned?: number;
}

/**
 * Undo HARMOS. TOTAL: a message whose first line is not a HARMOS contract is
 * returned unchanged. The contract names the shapes it used, so only those are
 * inverted, and they are inverted in reverse declaration order.
 */
export function harmosDecode(message: string): string {
  const nl = message.indexOf('\n');
  const first = nl === -1 ? message : message.slice(0, nl);
  const body = nl === -1 ? '' : message.slice(nl + 1);
  if (!first.startsWith(CONTRACT_HEAD)) return message;
  const used = FORMS.filter((f) => {
    const tag = f.terse.split('=')[0];               // e.g. '~8' -> '~'; '^6' -> '^'
    return first.includes(f.terse) || first.includes(f.clause) || first.includes(tag);
  });
  if (used.length === 0) return message;
  return unpackAll(body, used);
}

export function harmosEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => TagstackResult = tagstackFrontier,
): HarmosResult {
  const identity: TagstackResult = frontierFn(text, enc);
  const base = {
    codec: 'harmos' as const,
    decoded: text,
    exact: true,
    applied: false,
    frontierTokens: identity.messageTokens,
    messageTokens: identity.messageTokens,
    frontierParent: identity.parentCodec,
  };
  const refuse = (notes: string): HarmosResult => ({ ...base, message: identity.message, notes });

  const { T, used, counts } = packAll(text);
  if (!used.length) return refuse('refused: no packable compound-token shapes');
  // G1 — a marker already in the source would make the inverse a guess
  const clash = MARKERS.filter((m) => text.includes(m));
  if (clash.length) return refuse(`refused: source already contains marker ${JSON.stringify(clash)}`);

  // G3 — byte-exact round trip
  if (unpackAll(T, used) !== text) return refuse(`refused: round trip failed (${used.map((f) => f.id).join(',')})`);
  if (T.length >= text.length) return refuse('refused: no characters removed');

  // arms A (contract inside the frontier) and B (contract prepended outside it)
  const armA = (u: Form[]) => {
    const c = contractOf(u, true);
    const r: TagstackResult = frontierFn(c + '\n' + T, enc);
    return { tokens: r.messageTokens, message: r.message, parent: r.parentCodec, decoded: harmosDecode(r.decoded) };
  };
  const armB = (u: Form[]) => {
    const c = contractOf(u, true);
    const r: TagstackResult = frontierFn(T, enc);
    return {
      tokens: countTokens(c + '\n' + r.message, enc), message: c + '\n' + r.message,
      parent: r.parentCodec, decoded: harmosDecode(c + '\n' + r.decoded),
    };
  };

  let bestA = armA(used);
  let bestB = armB(used);
  let bestTok = Math.min(bestA.tokens, bestB.tokens);
  let cur = used;
  let pruned = 0;

  // GREEDY, BOUNDED REPAIR. Drop the least specific shape and re-test, at most
  // twice. This is the only search in the codec; it can return a locally- but not
  // globally-optimal shape set.
  for (let step = 0; step < 2 && cur.length > 1; step++) {
    const trial = cur.slice(0, -1);
    if (unpackAll(packAll(text).T, trial) !== text) break;
    const a = armA(trial);
    const b = armB(trial);
    const t = Math.min(a.tokens, b.tokens);
    if (t >= bestTok) break;
    cur = trial; bestA = a; bestB = b; bestTok = t; pruned++;
  }

  const usedC = countTokens(contractOf(cur, true), enc);
  if (!(bestTok < identity.messageTokens)) {
    return refuse(`refused: no win (best ${bestTok} >= frontier ${identity.messageTokens}); shapes ${cur.map((f) => f.id).join(',')}, contract ${usedC} tok`);
  }
  const win = bestA.tokens <= bestB.tokens ? bestA : bestB;
  if (win.decoded !== text) return refuse('refused: full two-layer round trip failed');

  const sites = Object.values(counts).reduce((a: number, b: number) => a + b, 0);
  return {
    ...base,
    applied: true,
    message: win.message,
    decoded: win.decoded,
    messageTokens: bestTok,
    frontierParent: win.parent,
    forms: cur.map((f) => f.id),
    counts,
    contractTokens: usedC,
    pruned,
    notes: `arm ${bestA.tokens <= bestB.tokens ? 'A(in)' : 'B(out)'}, shapes ${cur.map((f) => f.id).join('+')}` +
      (pruned ? ` (pruned ${pruned})` : '') +
      `, ${sites} sites, ${text.length - T.length} chars removed, contract ${usedC} tok, ` +
      `message ${identity.messageTokens}->${bestTok} (${bestTok - identity.messageTokens})`,
  };
}
