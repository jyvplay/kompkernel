/**
 * TEKMAR (τέκμαρ — "one who discerns or examines"; the index of a sundial, that
 * which casts the shadow the measure is read from; and in Euclid II.2 the L-shaped
 * remainder that reveals the square's structure).
 *
 * X46. A per-document search budget, chosen from a structural feature of the source
 * that costs nothing to compute.
 *
 * THE PROBLEM THIS SOLVES
 * ---------------------------------------------------------------------------
 * X43's KRISIS gates whole layers off. X45's METRON cut SYMPLOKE's shape-trial
 * ceiling from the value it has held since X24. Both spend LESS. METRON's own
 * verification then produced the counterexample that motivates this codec: on eleven
 * of twelve lanes cap 1 is byte-identical to cap 4 at 1.23-1.77x lower wall clock,
 * and on dump.sql it loses SIXTY TOKENS, 608 to 668, 9.9 per cent of the message.
 * X45 looked for a predictor of which is which, tried two candidates, refuted both,
 * and shipped the trade-off with the exception documented.
 *
 * THE CAP CURVE, MEASURED THIS TURN
 * ---------------------------------------------------------------------------
 * bench/x46/escalate.ts swept the ceiling on dump.sql at the oikonomia level, so the
 * sweep is not multiplied by the nine layers above it, with a byte-exact decode at
 * every point:
 *
 *     inCap   msg     ms      calls(M)
 *         1   684   35,460      5.53
 *         2   686   50,803      8.17    <- WORSE than cap 1
 *         4   662   95,508     15.41
 *         6   662   86,430     14.45
 *         8   662   97,109     15.82
 *        12   662   94,931     15.82
 *
 * Three things follow, and none of them was known before.
 *
 *   1. THE CURVE SATURATES AT 4. Caps 4, 6, 8 and 12 return the identical message
 *      size and the identical call count. The constant inherited from X24 is
 *      correct, and every ceiling above it is wasted work. So there is no
 *      compression to be had by spending more, which closes the escalation
 *      hypothesis this turn began with.
 *   2. THE SEARCH IS NOT A DESCENT. Cap 2 is worse than cap 1 -- 686 against 684 --
 *      so an extra 'in' shape trial can be accepted and make the wire larger. That
 *      is why a "keep going while it improves" rule cannot work here and why the
 *      decision has to be made BEFORE the search rather than during it.
 *   3. THE MARGINAL VALUE OF A TRIAL IS NOT SMALL AND UNIFORM. It is exactly zero on
 *      eleven lanes and twenty tokens on one. A single global constant is therefore
 *      wrong in one direction or the other no matter what it is set to, which is
 *      the whole case for a per-document choice.
 *
 * THE FEATURE
 * ---------------------------------------------------------------------------
 * SYMPLOKE's learned tier is a constant-width column lattice, so the question to ask
 * of a source is: how much of this document is made of rows sharing one field-width
 * signature? tekmarLatticeScore answers it by splitting lines on each of ",", tab,
 * "|" and ";", taking each line's vector of field widths, and finding the modal
 * signature. It reports what fraction of lines and of characters carry that
 * signature, how many competing signatures exist, and a purity ratio.
 *
 * It performs **NO TOKENIZATION**. That is the point, and it is what separates this
 * from the two predictors X45 refuted. arXiv 2605.04954, which studies per-instance
 * algorithm selection under a budget, finds that PIAS stays viable even when a
 * quarter of the total budget goes to computing features -- but that 11 to 28 per
 * cent of its loss to the virtual best solver is caused by the feature budget
 * itself. A feature that costs a linear scan and zero tokenizations pays no such tax,
 * which matters here because the thing being predicted is the size of a
 * tokenization budget.
 *
 * THE SEPARATION, MEASURED
 * ---------------------------------------------------------------------------
 * bench/x46/feature.ts, on the twelve lanes whose cap outcome X45 measured through
 * the full stack:
 *
 *     lane                 lineFrac  charFrac  purity   cap outcome
 *     dump.sql                0.722     0.922   0.788   NEEDS cap 4 (668 vs 608)
 *     page.html               0.062     0.237   0.857   cap 1 free (547=547)
 *     meeting-transcript      0.063     0.066   0.143   cap 1 free (384=384)
 *     bibliography            0.048     0.046   0.048   cap 1 free (667=667)
 *     email-thread            0.043     0.007   0.118   cap 1 free (488=488)
 *     component.jsx           0.037     0.044   0.167   cap 1 free (264=264)
 *     readme                  0.030     0.020   0.143   cap 1 free (646=646)
 *     kb-article              0.026     0.028   0.050   cap 1 free (622=622)
 *     prose-01                0.020     0.021   0.048   cap 1 free (736=736)
 *     chart.svg               0.000     0.000   0.000   cap 1 free (417=417)
 *     pom.xml                 0.000     0.000   0.000   cap 1 free (242=242)
 *     ls-full-iso             0.000     0.000   0.000   cap 1 free (364=364)
 *
 * The largest lineFrac among the eleven lanes where cap 1 is free is 0.063 and the
 * largest charFrac is 0.237. dump.sql sits at 0.722 and 0.922. **The margin on
 * lineFrac is a factor of 11.5 against the nearest free lane**, so the thresholds
 * below are not fitted to a boundary; they are placed in an empty band roughly five
 * times wider than either side needs.
 *
 * Note what this is NOT. It is not "columnar data needs the cap": ls-full-iso is
 * `ls --full-time` output and scores 0.000 because its columns are whitespace-
 * aligned rather than separator-delimited, and its cap-1 result is identical to its
 * cap-4 result, so the feature and the outcome agree for the right reason. The
 * feature tracks separator-delimited uniform-width rows, which is what SYMPLOKE's
 * learned lattice actually keys on.
 *
 * HELD-OUT DISCIPLINE
 * ---------------------------------------------------------------------------
 * arXiv 2610.11759 lists what is needed before an automated selection policy can be
 * trusted: fixed evaluation harnesses, SEPARATE SEARCH AND HELD-OUT INSTANCE SETS,
 * explicit budgets, replay of winning candidates, and ablations identifying which
 * change produced the gain. X45 did not separate them -- the twelve lanes were both
 * the evidence and the test. So the thresholds here are set on the twelve measured
 * lanes and then read against nine files never used to choose anything in any turn:
 *
 *     vix-daily-1990.csv      0.992  0.977   -> escalate
 *     aapl-2014.csv           0.855  0.826   -> escalate
 *     git-numstat.txt         0.123  0.119   -> cap 1
 *     json-pkg.txt            0.092  0.018   -> cap 1
 *     unified-diff.patch      0.071  0.034   -> cap 1
 *     gh-api.json.txt         0.062  0.030   -> cap 1
 *     lic-mit.txt             0.059  0.046   -> cap 1
 *     code-ts.txt             0.052  0.003   -> cap 1
 *     openstack-loghub-26.log 0.038  0.044   -> cap 1
 *     md-react / llm-answer / prose-08 / prose-09   <= 0.038   -> cap 1
 *
 * The two lanes it escalates that were never used to set the threshold are the two
 * dense comma-delimited CSVs, which are exactly the lanes where this stack's numeric
 * machinery does its best work -- SYSTOLE takes aapl 1450 to 1407 and vix 579 to 550.
 * A predictor that had been tuned on those two would be worthless; that it finds them
 * unprompted is the evidence that it is tracking the mechanism rather than the lanes.
 *
 * THE ERROR MODES ARE ASYMMETRIC, AND THE THRESHOLD IS SET ACCORDINGLY
 * ---------------------------------------------------------------------------
 * A FALSE POSITIVE escalates a lane that did not need it: time spent, tokens
 * unchanged, safe. A FALSE NEGATIVE leaves a lattice lane at cap 1: tokens lost,
 * unsafe. The thresholds are therefore placed well below dump.sql's score rather
 * than at the midpoint of the empty band, and the codec is explicitly conservative --
 * when in doubt it spends the search. That is also why TEKMAR can never be worse in
 * tokens than METRON and is expected to match ANALEPSIS everywhere: on a lattice
 * lane it uses the same cap ANALEPSIS uses, and on a flat lane cap 1 was measured
 * byte-identical to cap 4.
 *
 * Greedy: YES, and necessarily so. The decision is taken ONCE, before the search,
 * from a single linear scan, and is never revisited -- because the cap curve is not
 * a descent (cap 2 is worse than cap 1), no rule of the form "keep going while it
 * improves" can be used, and the only alternative is to run the search twice.
 *
 * Not optimal, in two specific and stated ways. The feature is a proxy for
 * "SYMPLOKE's learned lattice will engage", not the lattice's own firing condition,
 * so a document with uniform-width rows in an unusual separator would be missed. And
 * the threshold is a constant fitted on twelve lanes; arXiv 2605.04954's warning
 * applies, that a selection policy's loss is partly caused by its own feature budget
 * and partly by fitting on the instances it is later scored on. Nine held-out files
 * are scored here to limit the second, but nine is not a large sample.
 *
 * Time and CPU bound: yes. The feature is one pass over the lines with four
 * separator splits and no tokenization, measured at under a millisecond on every
 * lane in the table above including the 5,159-character dump.sql. What it controls
 * is a budget whose two ends differ by 44 to 58 per cent of all countTokens calls
 * the encode makes.
 */
import { type EncodingName } from './bpe';
import { analepsisEncode, analepsisDecode, type AnalepsisResult } from './analepsis';

/** Separators the lattice probe tries. Whitespace is deliberately excluded. */
export const TEKMAR_SEPS = [',', '\t', '|', ';'] as const;
/**
 * Fraction of non-empty lines that must carry the modal field-width signature.
 * Set below dump.sql's 0.722 and far above the largest cap-1-free lane's 0.063.
 */
export const TEKMAR_LINE_FRAC = 0.30;
/** Fraction of all characters those lines must account for. dump.sql 0.922; largest free lane 0.237. */
export const TEKMAR_CHAR_FRAC = 0.50;
/** Ceiling used when the lattice is present: the measured saturation point. */
export const TEKMAR_CAP_LATTICE = 4;
/** Ceiling used when it is not: METRON's floor, below which nothing changes. */
export const TEKMAR_CAP_FLAT = 1;
/** Abandonment gate, unchanged from X33. */
export const TEKMAR_IN_GATE = 1;

export interface TekmarScore {
  sep: string;
  coverLines: number;
  lines: number;
  lineFrac: number;
  charFrac: number;
  distinct: number;
  purity: number;
  sig: string;
}

/** Field-width signature of one line under one separator, or null if it has none. */
function signature(line: string, sep: string): string | null {
  if (!line.includes(sep)) return null;
  const f = line.split(sep);
  if (f.length < 2) return null;
  return f.map((x) => x.length).join('.');
}

/**
 * How much of `text` is made of rows sharing one field-width signature.
 * One linear scan per separator. No tokenization, no allocation of substrings
 * longer than a line, no regex.
 */
export function tekmarLatticeScore(text: string): TekmarScore {
  const lines = text.split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  let best = { sep: '', coverLines: 0, coverChars: 0, sig: '', distinct: 0 };
  for (const sep of TEKMAR_SEPS) {
    const counts = new Map<string, { n: number; ch: number }>();
    for (const l of nonEmpty) {
      const s = signature(l, sep);
      if (s === null) continue;
      const e = counts.get(s) ?? { n: 0, ch: 0 };
      e.n++; e.ch += l.length; counts.set(s, e);
    }
    if (!counts.size) continue;
    let topSig = '', topN = 0, topCh = 0;
    for (const [s, e] of counts) if (e.n > topN) { topN = e.n; topSig = s; topCh = e.ch; }
    if (topN > best.coverLines) best = { sep, coverLines: topN, coverChars: topCh, sig: topSig, distinct: counts.size };
  }
  const totalLines = Math.max(nonEmpty.length, 1);
  const totalChars = Math.max(text.length, 1);
  return {
    sep: best.sep,
    coverLines: best.coverLines,
    lines: nonEmpty.length,
    lineFrac: best.coverLines / totalLines,
    charFrac: best.coverChars / totalChars,
    distinct: best.distinct,
    purity: best.distinct ? best.coverLines / (best.distinct + best.coverLines) : 0,
    sig: best.sig,
  };
}

/** Decide the shape-trial ceiling for one document. Called once, before any search. */
export function tekmarChooseCap(text: string): { cap: number; gate: number; lattice: boolean; score: TekmarScore } {
  const score = tekmarLatticeScore(text);
  const lattice = score.lineFrac >= TEKMAR_LINE_FRAC || score.charFrac >= TEKMAR_CHAR_FRAC;
  return {
    cap: lattice ? TEKMAR_CAP_LATTICE : TEKMAR_CAP_FLAT,
    gate: TEKMAR_IN_GATE,
    lattice,
    score,
  };
}

export interface TekmarResult extends AnalepsisResult {
  tekmar: boolean;
  tekmarCap: number;
  tekmarLattice: boolean;
  tekmarScore: TekmarScore;
}

export function tekmarEncode(
  text: string, enc: EncodingName = 'o200k_base', opts: Record<string, any> = {},
): TekmarResult {
  if (opts.tekmar === false) {
    const r = analepsisEncode(text, enc, opts);
    return { ...r, tekmar: false, tekmarCap: opts.inCap ?? 4, tekmarLattice: false, tekmarScore: tekmarLatticeScore(text) };
  }
  const { cap, gate, lattice, score } = tekmarChooseCap(text);
  const r = analepsisEncode(text, enc, {
    ...opts,
    inCap: opts.inCap ?? cap,
    inGate: opts.inGate ?? gate,
  });
  return { ...r, tekmar: true, tekmarCap: cap, tekmarLattice: lattice, tekmarScore: score };
}

/** Decode is the parent's: TEKMAR changes how much search runs, never a wire format. */
export function tekmarDecode(wire: string, cfg: any, opts: any = {}): string {
  return analepsisDecode(wire, cfg, opts);
}
