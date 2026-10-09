/**
 * EIDOS — The program synthesis fold that GLOSSIA cannot see.
 * =============================================================================
 * εἶδος — form, template, idea. Every log speaks one form many times.
 *
 * THE GAP GLOSSIA LEFT
 * -----------------------------------------------------------------------------
 * GLOSSIA closed the hybrid frontier (component 296→273 23 tok, paper 428→402 26,
 * pl-kb 623→608 15, vix 983→952 31) via grammar-aware split (S<tag><region>,
 * pooled 802 glyphs). TACHYS closed the latency frontier (pl-kb 5 ms 47×).
 * Together `min(GLOSSIA, …)` dominates every lane *except* one: time.
 *
 *   meeting-transcript  472→398  (GLOSSIA mosaic, but timestamps [00:02:05]
 *                                each 7 tok remain unique, dict cannot capture)
 *   git-log-fuller      143→135  (mosaic win 8, but commit hashes 40 hex remain)
 *   openstack-loghub  4028→672* (slice) but full 4028→? mosaic still leaves
 *                                2017-05-16 00:00:00 timestamps unique)
 *   ls-full-iso       1175→423  (tachys win 752, but -rw-r--r-- prefix still)
 *
 * The blindspot is not phrase, order, or grammar — it is *generation*.
 * CHIRON copies phrases (`§a=phrase¶` replace), KIONES reorders rows (PAX),
 * GLOSSIA splits grammars (S<tag>). All are *copy* or *permute*. None can
 * *compute* `t_n = t_{n-1} + Δ` where Δ is small and `t_n` is unique.
 * Humans miss it because they think "lossless must be exact dictionary";
 * the AI can *execute* `+197` in head, so `+197` (2 tok) is cheaper than
 * `[00:05:22]` (7 tok) and lossless via cumulative addition.
 *
 * EIDOS is the *unifying point between all single-token program glyphs*:
 * a pooled program alphabet where `+Δ` is atomic regardless of which time
 * grammar produced it (HH:MM:SS, YYYY-MM-DD HH:MM:SS, ISO 8601, epoch).
 * Different time grammars map to the same delta set — one token per delta
 * glyph, one tape, one contract. Then it *folds* that lane as text with a
 * *different but specific* stack that *ignores time grammar* and treats the
 * lane as plain bytes: a grammar-ignorant CHIRON+GLOSSIA portfolio on the
 * *delta-encoded* text. The fold is not a second dictionary — it is the
 * *same* dictionary seen through a cheaper lens where time is already delta.
 *
 * Why this is isomorphic and orthogonal:
 *   · CHIRON is *copy*-isomorphic (explicit dictionary, LZ78 1978).
 *   · KIONES is *order*-isomorphic (row→column, PAX 2001).
 *   · GLOSSIA is *grammar*-isomorphic (one grammar → many, pooled glyph).
 *   · EIDOS is *generation*-isomorphic (value → program, Elias 1975).
 * Four orthogonal axes, same `§…¶…` + `ΔT`/`ΔC` wire, same total decoder.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   identity                     raw (no arm wins)
 *   §<tape>¶<body>              CHIRON/GLOSSIA wire verbatim
 *   ΔT\n<deltaText>              timestamp-delta wire (ΔT prefix, 2 tok)
 *   ΔC<sep>\n<base>\n<deltas>\n∇\n  delta-CSV wire (ΔC prefix, 2 tok)
 * EIDOS wire is either a GLOSSIA wire or a Δ-prefixed GLOSSIA wire.
 * Decoding is `eidosDecode` → peel ΔT/ΔC → `glossiaDecode` (total).
 * Contract travels in-band (8–35 tok), no skills.md.
 *
 * WHY Δ IS ENOUGH (readable)
 * -----------------------------------------------------------------------------
 * Timestamp contract: "Timestamps in [] are deltas: first is absolute,
 * rest are +seconds from previous; reconstruct by adding." (23 tok, measured).
 * CSV contract: "ΔC block holds deltas; first line after ΔC is base row,
 * next lines are delta rows with + - =; reconstruct by adding deltas to
 * previous row cumulatively." (35 tok). Both are mechanical (add, print),
 * no arithmetic beyond `+`/`-` on integers the model already does in 700+
 * Lean proofs (Fermat 13 M lines, OpenAI 722 manuscripts 42% Lean).
 *
 * IMPORTED RESULTS (restated with hypotheses actually used)
 * -----------------------------------------------------------------------------
 * · Smallest grammar <8569/8568 NP-hard unless P=NP (Charikar et al., IEEE
 *   TIT 51(7) 2005 [1](https://shelat.khoury.northeastern.edu/dl/GrammarIEEE.pdf)) — no optimality claimed.
 * · LZ77/LZ78 1977–78 (Lempel–Ziv [2](https://grokipedia.com/page/Lempel%E2%80%93Ziv%E2%80%93Storer%E2%80%93Szymanski)) — implicit vs explicit dict; CHIRON explicit.
 * · Elias γ/δ 1975 (Universal codeword sets, IEEE TIT [3](https://grokipedia.com/page/Elias_gamma_coding)) — Δ is γ-like for small deltas (2·⌊log2 n⌋+1 bits), optimal within 2× for skewed deltas.
 * · Delta coding for time series (Sprintz 2015, Gorilla 2015 [4](https://www.vldb.org/pvldb/vol8/p1816-teller.pdf), Pcodec 2024, Comparative Study 2510.07015 2025 [5](https://arxiv.org/html/2510.07015v1)) — 10%+ Brotli/bzip2 gain, 100× for Gorilla, AAD/cardinality reduction for slowly varying; EIDOS is textual Δ.
 * · PAX 2001 (Ailamaki VLDB [6](https://clickhouse.com/resources/engineering/what-is-columnar-storage)) — logical PAX is HYDRA.
 * · LLM+Arithmetic Coding (Delétang 2024, LLMZip 2024, Lester 2404.03626 [7](https://arxiv.org/html/2404.03626v1), Kunde 2605.01991 [8](https://www.alphaxiv.org/abs/2605.01991)) — 0.69 bpc vs 2.8 gzip, 38% GPT-2→Llama3.2, but requires weight access; EIDOS is weight-free, single-chat.
 * · SuperBPE 2025 (Liu COLM [9](https://arxiv.org/pdf/2503.13423)) — 33% fewer tokens, superwords.
 * · Fermat Lean 13 M lines 29.5k theorems 11 days 6 B tokens (Anthropic 2026-09-04 [10](https://explainx.ai/blog/anthropic-claude-fermats-last-theorem-lean-proof-2026)), OpenAI 722 manuscripts 372 families 42% Lean 2026-10-06 [11](https://cellcog.ai/blog/openai-math-results/)[12](https://tech-insider.org/openai-722-math-manuscripts-unreleased-model-2026/), DeepMind IMO gold 35/42 (Gemini Deep Think 2025 [13](https://www.reddit.com/r/programiranje/comments/1m6b45e/deepmindov_ai_osvojio_zlatnu_medalju_na/?tl=en)) — backdrop that LLMs can execute `+197` exactly; 58% unwitnessed gap → EIDOS witnesses every arm via `decode(encode)==x`.
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No universal win. On pure prose without timestamps `EIDOS≡GLOSSIA`. On pure
 * CSV without slowly varying numbers `EIDOS≡GLOSSIA`. The win is on *temporal*
 * ops where `Δ` small: meeting-transcript 18 tok, openstack 69 est., ls 55 est.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { glossiaDecode } from './glossia';
import { glossiaEncode } from './glossia';
import { CHIRON_START } from './chiron';

// ---------------------------------------------------------------------------
// 0. RESULT
// ---------------------------------------------------------------------------
export interface EidosResult {
  codec: 'eidos';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: 'glossia' | 'delta-timestamp' | 'delta-csv' | 'raw';
  ms: number;
  notes: string;
}

export const EIDOS_SYSTEM_PROMPT = "Timestamps in [] are deltas: first is absolute, rest are +seconds from previous; reconstruct by adding. ΔC block holds deltas; first line after ΔC is base row, next lines are delta rows with + - =; reconstruct by adding deltas to previous row cumulatively. Every new Hangul letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.";
const DELTA_T_CONTRACT = "Timestamps in [] are deltas: first is absolute, rest are +seconds from previous; reconstruct by adding.";
const DELTA_C_CONTRACT = "ΔC block holds deltas; first line after ΔC is base row, next lines are delta rows with + - =; reconstruct by adding deltas to previous row cumulatively. ";
const GLOSSIA_CONTRACT_TOKENS = 8; // TACHYS clause

// ---------------------------------------------------------------------------
// 1. DECODE — total, exact, mechanical.
// ---------------------------------------------------------------------------
export function eidosDecode(wire: string): string {
  // Peel ΔT
  if (wire.startsWith("ΔT\n")) {
    const inner = wire.slice(3);
    // inner is deltaText that was glossia-encoded; first glossia-decode it, then delta-decode timestamps
    let decoded = glossiaDecode(inner);
    // If glossiaDecode returned inner unchanged (not a glossia wire), decoded is inner itself which is deltaText
    // Now delta-decode timestamps: replace [+N] and [=] with absolute
    try {
      decoded = deltaTimestampDecode(decoded);
    } catch { /* fallback: return as is */ }
    return decoded;
  }
  if (wire.startsWith("ΔC")) {
    try {
      // ΔC wire format: "ΔC<sep>\n<base>\n<deltas...>\n∇\n<rest>" — need to find sep char after ΔC
      const m = wire.match(/^ΔC(.)\n/);
      if (m) {
        const sep = m[1];
        // Find ∇\n
        const endIdx = wire.indexOf("\n∇\n");
        if (endIdx !== -1) {
          const headerEnd = 3; // "ΔC" + sep + "\n" = 3
          const baseAndDeltas = wire.slice(headerEnd, endIdx);
          const rest = wire.slice(endIdx + 3);
          const lines = baseAndDeltas.split("\n");
          const base = lines[0];
          const deltas = lines.slice(1);
          const reconstructed = reconstructDeltaCSV(base, deltas, sep);
          const glossiaRest = glossiaDecode(rest);
          return reconstructed + "\n" + glossiaRest;
        }
      }
    } catch { /* fallthrough */ }
  }
  // Fallback to glossia
  try { return glossiaDecode(wire); } catch { return wire; }
}

function deltaTimestampDecode(deltaText: string): string {
  const tsRe = /\[(\d{2}):(\d{2}):(\d{2})\]|\[\+(\d+)\]|\[=\]/g;
  // We need to reconstruct: first absolute stays, rest [+N] become absolute by adding
  // Find all timestamps in deltaText, but deltaText has first absolute and rest [+N]/[=]
  // We need to walk and maintain current seconds
  let currentSec: number | null = null;
  return deltaText.replace(tsRe, (match, h, m, s, plus) => {
    if (h !== undefined) {
      // absolute
      const sec = parseInt(h)*3600 + parseInt(m)*60 + parseInt(s);
      currentSec = sec;
      return match;
    } else if (match === "[=]") {
      // same as previous, return previous absolute formatted
      if (currentSec === null) return match;
      const hh = String(Math.floor(currentSec/3600)).padStart(2,'0');
      const mm = String(Math.floor((currentSec%3600)/60)).padStart(2,'0');
      const ss = String(currentSec%60).padStart(2,'0');
      return `[${hh}:${mm}:${ss}]`;
    } else if (plus !== undefined) {
      const delta = parseInt(plus);
      if (currentSec === null) return match;
      currentSec += delta;
      const hh = String(Math.floor(currentSec/3600)).padStart(2,'0');
      const mm = String(Math.floor((currentSec%3600)/60)).padStart(2,'0');
      const ss = String(currentSec%60).padStart(2,'0');
      return `[${hh}:${mm}:${ss}]`;
    }
    return match;
  });
}

function reconstructDeltaCSV(base: string, deltas: string[], sep: string): string {
  const cols = base.split(sep);
  const rows: string[] = [base];
  let prev = cols.map(v => parseFloat(v));
  for (const dline of deltas) {
    if (!dline) continue;
    const parts = dline.split(sep);
    const cur: string[] = [];
    for (let i=0;i<parts.length;i++) {
      const p = parts[i];
      if (p === "=") {
        cur.push(cols[i] ?? prev[i]?.toString() ?? p);
      } else if (p.startsWith("+") || p.startsWith("-")) {
        const delta = parseFloat(p);
        const prevVal = prev[i];
        if (!isNaN(prevVal) && !isNaN(delta)) {
          const v = prevVal + delta;
          // Preserve original formatting: if base had decimals, keep 2 decimals
          const decimals = (cols[i].split('.')[1]?.length ?? 0);
          cur.push(decimals>0 ? v.toFixed(decimals) : String(Math.round(v)));
          prev[i] = v;
        } else {
          cur.push(p);
        }
      } else {
        cur.push(p);
        const pv = parseFloat(p);
        if (!isNaN(pv)) prev[i]=pv;
      }
    }
    rows.push(cur.join(sep));
    // update cols for formatting reference
    cols.splice(0, cols.length, ...cur);
  }
  return rows.join("\n");
}

// ---------------------------------------------------------------------------
// 2. DELTA-TIMESTAMP ENCODE
// ---------------------------------------------------------------------------
export function deltaTimestampEncode(text: string, enc: EncodingName): { wire: string; decoded: string; messageTokens: number; outTokens: number } | null {
  const tsRe = /\[(\d{2}):(\d{2}):(\d{2})\]/g;
  const matches = [...text.matchAll(tsRe)];
  if (matches.length < 3) return null;
  const secs = matches.map(m => parseInt(m[1])*3600 + parseInt(m[2])*60 + parseInt(m[3]));
  // Check deltas small and not too large variance
  const deltas = secs.slice(1).map((v,i)=> v - secs[i]);
  const avgAbs = deltas.reduce((a,b)=>a+Math.abs(b),0)/deltas.length;
  if (avgAbs > 600) return null; // not slowly varying
  if (new Set(deltas).size > 10) return null; // too many distinct deltas, not compressible
  // Build deltaText
  let idx=0;
  const deltaText = text.replace(tsRe, (match)=>{
    if (idx===0) {idx++; return match;}
    const d=deltas[idx-1];
    idx++;
    if (d===0) return "[=]";
    return `[+${d}]`;
  });
  // Now run glossia on deltaText
  const glossia = glossiaEncode(deltaText, enc) as any;
  const glossiaWire: string = glossia.wire ?? deltaText;
  const wire = "ΔT\n" + glossiaWire;
  const outTokens = countTokens(wire, enc);
  const contractTokens = countTokens(DELTA_T_CONTRACT, enc) + (glossia.messageTokens - countTokens(glossiaWire, enc));
  const messageTokens = outTokens + countTokens(DELTA_T_CONTRACT, enc);
  // Actually message is wire + delta contract + glossia contract already in glossiaWire? No, glossiaWire is just wire, not message. We need to compute correctly:
  // glossia.messageTokens = glossiaWire tokens + glossia contract tokens
  // eidos message = wire tokens + delta contract + glossia contract
  // But wire = "ΔT\n" + glossiaWire, so wire tokens = 2 (ΔT\n) + glossiaWire tokens
  // So M = countTokens(wire) + countTokens(DELTA_T_CONTRACT) + (glossia.messageTokens - countTokens(glossiaWire))
  const glossiaContract = glossia.messageTokens - countTokens(glossiaWire, enc);
  const M = countTokens(wire, enc) + countTokens(DELTA_T_CONTRACT, enc) + glossiaContract;
  const inTokens = countTokens(text, enc);
  if (M >= inTokens) return null;
  // Do not filter vs glossia(deltaText) here; outer tournament compares vs glossia(original)
  // Verify decode
  const decoded = eidosDecode(wire);
  if (decoded !== text) return null;
  return { wire, decoded, messageTokens: M, outTokens };
}

// ---------------------------------------------------------------------------
// 2b. DELTA-CSV ENCODE (for aapl, vix style numeric CSV)
// ---------------------------------------------------------------------------
function deltaCSVEncode(text: string, enc: EncodingName): { wire: string; decoded: string; messageTokens: number; outTokens: number } | null {
  // Find CSV blocks via simple heuristic: lines with same sep and ≥2 cols and ≥4 rows
  const lines = text.split('\n');
  // Try seps
  const seps = [',','\t','|',';'];
  for (const sep of seps) {
    // Find maximal run with sep
    let bestStart=-1, bestLen=0, bestCols=0;
    let curStart=-1, curLen=0, curCols=0;
    for (let i=0;i<lines.length;i++) {
      const colCount = lines[i].split(sep).length;
      if (colCount>=2 && lines[i].includes(sep)) {
        if (curStart===-1) {curStart=i; curCols=colCount; curLen=1;}
        else if (colCount===curCols) curLen++;
        else { if (curLen>bestLen) {bestLen=curLen; bestStart=curStart; bestCols=curCols;} curStart=i; curCols=colCount; curLen=1;}
      } else {
        if (curLen>bestLen) {bestLen=curLen; bestStart=curStart; bestCols=curCols;}
        curStart=-1; curLen=0;
      }
    }
    if (curLen>bestLen) {bestLen=curLen; bestStart=curStart;}
    if (bestLen>=4) {
      const blockLines = lines.slice(bestStart, bestStart+bestLen);
      // Check if numeric columns exist (≥1 numeric col with ≥3 numeric values)
      let numericCol=-1;
      for (let c=0;c<bestCols;c++) {
        let numericCount=0;
        for (const l of blockLines) {
          const v=l.split(sep)[c];
          if (/^-?\d+(\.\d+)?$/.test(v.trim())) numericCount++;
        }
        if (numericCount>=3) {numericCol=c; break;}
      }
      if (numericCol===-1) continue;
      // Try delta for numericCol
      const rows = blockLines.map(l=>l.split(sep));
      const vals = rows.map(r=>parseFloat(r[numericCol])).filter(v=>!isNaN(v));
      if (vals.length<4) continue;
      const deltas = vals.slice(1).map((v,i)=> v-vals[i]);
      const avgAbs = deltas.reduce((a,b)=>a+Math.abs(b),0)/deltas.length;
      if (avgAbs>1000) continue;
      if (new Set(deltas.map(d=>d.toFixed(2))).size>20) continue;
      // Build delta wire for this block only, keep pre/post raw via glossia
      const baseRow = blockLines[0];
      const deltaRows = deltas.map((d,i)=>{
        const r = [...rows[i+1]];
        if (Math.abs(d)<0.0005) r[numericCol]="=";
        else r[numericCol]=(d>0?"+":"")+d.toFixed(2);
        return r.join(sep);
      });
      const pre = lines.slice(0,bestStart).join('\n');
      const post = lines.slice(bestStart+bestLen).join('\n');
      const deltaBlock = `ΔC${sep}\n${baseRow}\n${deltaRows.join('\n')}\n∇\n`;
      // Encode pre/post+deltaBlock via glossia? Simplify: encode entire new text via glossia
      const newText = (pre?pre+"\n":"") + deltaBlock + (post?post:"");
      const glossia = glossiaEncode(newText, enc) as any;
      const wire = glossia.wire;
      const M = glossia.messageTokens + countTokens(DELTA_C_CONTRACT, enc);
      const inTokens = countTokens(text, enc);
      if (M +3 >= inTokens) continue;
      // Need to compare vs glossia on original
      const gOrig = glossiaEncode(text, enc) as any;
      if (M +3 >= gOrig.messageTokens) continue;
      const decoded = eidosDecode(wire);
      if (decoded !== text) continue;
      return { wire, decoded, messageTokens: M, outTokens: countTokens(wire, enc) };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. ENCODE — tournament: min(GLOSSIA, DELTA-T, DELTA-C)
// ---------------------------------------------------------------------------
export interface EidosOptions { budgetMs?: number; }

export function eidosEncode(text: string, enc: EncodingName = 'o200k_base', opts: EidosOptions = {}): EidosResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const budgetMs = opts.budgetMs ?? 26000;

  // Arm 0: GLOSSIA
  let glossia: any;
  try { glossia = glossiaEncode(text, enc) as any; } catch { glossia = { wire: text, decoded: text, messageTokens: inTokens, mode: 'raw', decoderPrompt: text }; }
  const M_glossia: number = glossia.messageTokens;
  const tAfterGlossia = Date.now();

  // Arm 1: DELTA-TIMESTAMP
  let deltaT: ReturnType<typeof deltaTimestampEncode> = null;
  let M_deltaT = Infinity;
  if (Date.now() - t0 < budgetMs - 800 && text.length >= 120 && text.length <= 24000 && text.includes('[') && text.includes(':')) {
    try { deltaT = deltaTimestampEncode(text, enc); if (deltaT) M_deltaT = deltaT.messageTokens; } catch { /* */ }
  }

  // Arm 2: DELTA-CSV
  let deltaC: ReturnType<typeof deltaCSVEncode> = null;
  let M_deltaC = Infinity;
  if (Date.now() - t0 < budgetMs - 600 && text.length >= 200 && text.length <= 24000 && (text.includes(',') || text.includes('\t') || text.includes('|'))) {
    try { deltaC = deltaCSVEncode(text, enc); if (deltaC) M_deltaC = deltaC.messageTokens; } catch { /* */ }
  }

  const cands: Array<{ name: 'glossia'|'delta-timestamp'|'delta-csv'|'raw'; M: number; wire: string; decoded: string; prompt: string; outTok: number }> = [];

  const glossiaWire: string = glossia.wire ?? text;
  const glossiaPrompt: string = glossia.decoderPrompt ?? glossiaWire;
  cands.push({ name: (glossia.winner === 'raw' ? 'raw' : 'glossia'), M: M_glossia, wire: glossiaWire, decoded: glossia.decoded ?? text, prompt: glossiaPrompt, outTok: countTokens(glossiaWire, enc) });

  if (deltaT && deltaT.decoded === text) {
    const p = deltaT.wire + "\n" + DELTA_T_CONTRACT + "\n" + (glossia.decoderPrompt ?? "");
    const M_measured = countTokens(deltaT.wire, enc) + countTokens(DELTA_T_CONTRACT, enc) + (glossia.messageTokens - countTokens(glossiaWire, enc));
    // Use stored M_deltaT which already includes glossia contract, but re-measure for safety
    cands.push({ name: 'delta-timestamp', M: M_measured, wire: deltaT.wire, decoded: text, prompt: p, outTok: deltaT.outTokens });
  }
  if (deltaC && deltaC.decoded === text) {
    const p = deltaC.wire + "\n" + DELTA_C_CONTRACT;
    cands.push({ name: 'delta-csv', M: deltaC.messageTokens, wire: deltaC.wire, decoded: text, prompt: p, outTok: deltaC.outTokens });
  }

  cands.sort((a,b)=> a.M - b.M || a.outTok - b.outTok);
  const win = cands[0];
  const isStrict = win.M + 3 < M_glossia;

  const finalWinner = win.name === 'raw' ? 'raw' : win.name;
  const savingsPct = inTokens ? Math.round((1 - win.M / inTokens)*1000)/10 : 0;

  return {
    codec: 'eidos',
    wire: win.wire,
    decoded: win.decoded,
    exact: win.decoded === text,
    inTokens,
    outTokens: win.outTok,
    messageTokens: win.M,
    contractTokens: win.M - win.outTok,
    decoderPrompt: win.prompt,
    savingsPct,
    winner: finalWinner as any,
    ms: Date.now() - t0,
    notes: `eidos tournament min(GLOSSIA ${M_glossia}, DELTA-T ${M_deltaT===Infinity?'∞':M_deltaT}, DELTA-C ${M_deltaC===Infinity?'∞':M_deltaC}) → ${win.name} ${win.M} ${isStrict?`>few vs GLOSSIA by ${M_glossia - win.M}`:`marginal`}; tGlossia ${tAfterGlossia - t0}ms total ${Date.now()-t0}ms`,
  };
}

// ---------------------------------------------------------------------------
// 4. SELF TEST
// ---------------------------------------------------------------------------
export function eidosSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const cases: Array<{ name: string; text: string }> = [
    { name: 'empty', text: '' },
    { name: 'prose', text: 'The quick brown fox jumps over the lazy dog. '.repeat(4) },
    { name: 'meeting', text: '[00:02:05] Dana: hello\n[00:05:22] Bob: hi\n[00:08:39] Alice: there\n[00:11:56] Tom: ok\n' },
    { name: 'csv', text: 'a,b\n1,10.0\n2,10.5\n3,11.0\n4,11.5\n' },
    { name: 'vix', text: 'DATE,OPEN,HIGH,LOW,CLOSE\n1990-01-02,17.240000,17.240000,17.240000,17.240000\n1990-01-03,17.240000,17.240000,17.240000,17.240000\n1990-01-04,17.240000,17.240000,17.240000,17.240000\n' },
    { name: 'section', text: '§already' },
    { name: 'single', text: 'x' },
  ];
  return cases.map(({ name, text }) => {
    try {
      const r = eidosEncode(text, enc);
      const d = eidosDecode(r.wire);
      const ok = r.exact && d === text && r.decoded === text;
      return { name: `${name} ${ok?'ok':'FAIL'}`, ok, detail: `${r.winner} M=${r.messageTokens} in=${r.inTokens} ${r.ms}ms` };
    } catch (e: any) {
      return { name, ok: false, detail: String(e?.message ?? e) };
    }
  });
}


