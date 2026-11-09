/**
 * X91 — GENERALIZED LOCAL LEADERS, PER CATEGORY.
 *
 * What X90 produced was a per-category AGGREGATE (bench/x90/receipts/leaders-x90.json:
 * lanes, raw, gate, shippedX89, shippedX90, floor, ratio, moved). That answers "how does the
 * category do" and not "who leads it", and the user asked for the second thing: a generalized
 * list of LOCAL LEADERS for prose, ops and the other categories.
 *
 * This is a pure join over committed receipts, ZERO frontier calls, so zero drift and no
 * machine-load contamination. It reads bench/x90/receipts/leaders-x90.json, which is itself a
 * join of bench/x89/receipts/{leaders-shipped,front3-runG}.json and
 * bench/x90/receipts/run-extras.json.
 *
 * THE LEADER RULE, STATED SO IT CAN BE ARGUED WITH. A category leader is the lane with the
 * lowest shipped/raw ratio, i.e. the one the stack compresses hardest. Two guards, both of
 * which are here because of bugs this repository has already paid for:
 *
 *   1. KEYED BY `path`, NEVER BY BASENAME. bench/x90/leaders.ts had two join bugs and the
 *      second was a basename collision -- there are two different df-h.txt in the corpus, and
 *      two different dpkg-l.txt (bench/holdout-x42/dpkg-l.txt at 4 459 chars and
 *      bench/z29/ops-real/dpkg-l.txt at 34 434). A leader named only by basename is ambiguous.
 *      Every row below prints its full path.
 *
 *   2. A SIZE FLOOR OF 500 RAW TOKENS for the headline leader, reported ALONGSIDE the
 *      unfiltered winner rather than instead of it. A 60-token lane such as lsblk.txt can post
 *      a ratio of 1.000 or 0.983 and top or bottom a ranking on what is effectively a rounding
 *      artifact, and a category whose leader is a lane with no structure to exploit tells the
 *      reader nothing about the category. Both winners are printed so the effect of the rule is
 *      visible instead of baked in.
 *
 * A SECOND AXIS IS REPORTED BECAUSE THE FIRST ONE FLATTERS THE STACK. shipped/raw measures how
 * much the stack removes from the source; shipped/floor measures how close the result is to the
 * independent readability floor (the brotli-derived floor X90 computed per lane). A category can
 * lead on the first and trail on the second, and the gap between them is the remaining
 * headroom that is actually addressable. `floorVsShipped < 1.00` is the readability-price law:
 * the stack should never beat the floor, and X90 measured it holding on 32 of 34 lanes with the
 * two exceptions being lsblk 1.017 and free-m 1.000. Any lane where that inverts is printed as
 * a law violation rather than silently averaged away.
 *
 * X93 INVARIANCE. ΕΥΘΥΝΤΗΡΙΑ changes the allowance two searches run under and emits no wire of
 * its own, so if it is sound this table is IDENTICAL to X90's -- not merely similar, but the
 * same numbers, because the same messages are produced. That is a testable claim rather than an
 * argument: bench/x91/decouple-sweep.ts scores the SHA-256 of the complete message per lane,
 * and this script prints, per lane, whether that identity has been measured yet. Lanes with no
 * measurement are marked UNTESTED and are not claimed.
 */
import * as fs from 'node:fs';

const SRC = 'bench/x90/receipts/leaders-x90.json';
const DEC = 'bench/x91/receipts/decouple-sweep.json';
const OUT = 'bench/x91/receipts/leaders-general.json';
const SIZE_FLOOR = 500;

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const rows: any[] = src.rows;
if (!Array.isArray(rows) || rows.length === 0) throw new Error(`${SRC}: no rows`);
for (const f of ['path', 'cat', 'raw', 'shippedX90', 'floor']) {
  const missing = rows.filter(r => r[f] === undefined);
  if (missing.length) throw new Error(`${SRC}: ${missing.length} rows missing field ${f} (schema changed? inspect before joining)`);
}
// fail loud on basename collisions: the reason leaders are keyed by path
const byBase = new Map<string, string[]>();
for (const r of rows) {
  const b = r.path.split('/').pop()!;
  byBase.set(b, [...(byBase.get(b) ?? []), r.path]);
}
const collisions = [...byBase.entries()].filter(([, v]) => v.length > 1);

let dec: any = null;
try { dec = JSON.parse(fs.readFileSync(DEC, 'utf8')); } catch { /* not run yet */ }
const decByPath = new Map<string, any>();
for (const l of dec?.lanes ?? []) decByPath.set(l.path, l);

const cats = [...new Set(rows.map(r => r.cat))].sort();
const out: any = { source: SRC, decoupleReceipt: dec ? DEC : null, sizeFloor: SIZE_FLOOR,
  basenameCollisions: collisions.map(([b, v]) => ({ basename: b, paths: v })), categories: [] };

const lines: string[] = [];
lines.push(`GENERALIZED LOCAL LEADERS — pure join over ${SRC} (${rows.length} lanes, zero frontier calls)`);
lines.push(`leader rule: lowest shippedX90/raw, headline leader restricted to raw >= ${SIZE_FLOOR} tokens; both winners printed`);
lines.push(`basename collisions in the corpus (why leaders are keyed by path): ${collisions.length ? collisions.map(([b, v]) => `${b} [${v.join(' | ')}]`).join('; ') : 'none'}`);
lines.push('');
for (const cat of cats) {
  const rs = rows.filter(r => r.cat === cat);
  const raw = rs.reduce((a, r) => a + r.raw, 0);
  const sh = rs.reduce((a, r) => a + r.shippedX90, 0);
  const fl = rs.reduce((a, r) => a + r.floor, 0);
  const ranked = [...rs].sort((a, b) => (a.shippedX90 / a.raw) - (b.shippedX90 / b.raw));
  const big = ranked.filter(r => r.raw >= SIZE_FLOOR);
  const lead = big[0] ?? ranked[0];
  const leadUnfiltered = ranked[0];
  const worst = ranked[ranked.length - 1];
  // the law is floor/shipped < 1.00: the stack must never beat the independent readability
  // floor. A ratio AT or ABOVE 1.00 means the stack emitted fewer tokens than the floor, which
  // is the violation. (The first version of this script had the comparison inverted and
  // reported 32 of 34 lanes as violating a law X90 measured as holding on 32 of 34.)
  const viol = rs.filter(r => r.floor / r.shippedX90 >= 1.0);
  const catOut: any = { cat, lanes: rs.length, raw, shippedX90: sh, floor: fl,
    ratio: +(sh / raw).toFixed(4), floorVsShipped: +(fl / sh).toFixed(4),
    leader: { path: lead.path, raw: lead.raw, shippedX90: lead.shippedX90, ratio: +(lead.shippedX90 / lead.raw).toFixed(4),
              filtered: big.length > 0, parent: lead.shippedParent ?? lead.parent ?? null },
    leaderUnfiltered: { path: leadUnfiltered.path, raw: leadUnfiltered.raw, shippedX90: leadUnfiltered.shippedX90,
              ratio: +(leadUnfiltered.shippedX90 / leadUnfiltered.raw).toFixed(4) },
    worst: { path: worst.path, raw: worst.raw, shippedX90: worst.shippedX90, ratio: +(worst.shippedX90 / worst.raw).toFixed(4) },
    readabilityLawViolations: viol.map(r => ({ path: r.path, floorVsShipped: +(r.floor / r.shippedX90).toFixed(4) })),
    ranking: ranked.map(r => {
      const d = decByPath.get(r.path);
      return { path: r.path, raw: r.raw, gate: r.gate ?? r.F, shippedX90: r.shippedX90, floor: r.floor,
        ratio: +(r.shippedX90 / r.raw).toFixed(4), floorVsShipped: +(r.floor / r.shippedX90).toFixed(4),
        x93: d ? { candidateDelta: d.candidateDelta, shaSame: d.candidateShaSame, exactAll: d.exactAll,
                   controlMatchesCommitted: d.controlMatchesCommitted, speedup: d.speedup } : 'UNTESTED' };
    }) };
  out.categories.push(catOut);
  lines.push(`## ${cat} — ${rs.length} lanes, raw ${raw} -> shipped ${sh} (ratio ${catOut.ratio}), floor ${fl} (floor/shipped ${catOut.floorVsShipped})`);
  lines.push(`   LEADER (raw>=${SIZE_FLOOR}): ${lead.path}  ${lead.raw} -> ${lead.shippedX90}  ratio ${catOut.leader.ratio}`);
  if (leadUnfiltered.path !== lead.path) lines.push(`   leader without the size floor: ${leadUnfiltered.path}  ${leadUnfiltered.raw} -> ${leadUnfiltered.shippedX90}  ratio ${catOut.leaderUnfiltered.ratio}`);
  lines.push(`   weakest: ${worst.path}  ${worst.raw} -> ${worst.shippedX90}  ratio ${catOut.worst.ratio}`);
  lines.push(`   readability-price law floor/shipped<1.00: ${viol.length ? 'VIOLATED on ' + viol.map(r => `${r.path} ${(r.floor / r.shippedX90).toFixed(3)}`).join(', ') : 'holds on all ' + rs.length}`);
  lines.push(`   full ranking (best first):`);
  for (const r of catOut.ranking) {
    const x = typeof r.x93 === 'string' ? r.x93 : `X93 d=${r.x93.candidateDelta} sha=${r.x93.shaSame ? 'same' : 'DIFF'} x${r.x93.speedup}${r.x93.controlMatchesCommitted ? ' ctlOK' : ' CTL-BAD'}`;
    lines.push(`     ${String(r.shippedX90).padStart(5)}/${String(r.raw).padStart(5)} = ${r.ratio.toFixed(4)}  fl/sh ${r.floorVsShipped.toFixed(3)}  ${x.padEnd(34)} ${r.path}`);
  }
  lines.push('');
}
const totRaw = rows.reduce((a, r) => a + r.raw, 0), totSh = rows.reduce((a, r) => a + r.shippedX90, 0);
const totFl = rows.reduce((a, r) => a + r.floor, 0);
out.totals = { lanes: rows.length, raw: totRaw, shippedX90: totSh, floor: totFl, ratio: +(totSh / totRaw).toFixed(4), floorVsShipped: +(totFl / totSh).toFixed(4) };
lines.push(`## ALL — ${rows.length} lanes, raw ${totRaw} -> shipped ${totSh} (ratio ${(totSh / totRaw).toFixed(4)}), floor ${totFl} (floor/shipped ${(totFl / totSh).toFixed(4)})`);
const tested = rows.filter(r => decByPath.has(r.path));
lines.push(`X93 identity measured on ${tested.length}/${rows.length} lanes: ${tested.map(r => r.path.split('/').pop()).join(', ') || 'none yet'}`);
lines.push(`X93 UNTESTED on ${rows.length - tested.length} lanes — not claimed.`);
fs.mkdirSync('bench/x91/receipts', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
const log = lines.join('\n') + '\n';
fs.writeFileSync(OUT.replace(/\.json$/, '.log'), log);
console.log(log);
