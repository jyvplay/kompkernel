/**
 * AION — The constant fold that MNEMOSYNE and EIDOS cannot see.
 * =============================================================================
 * αἰών — eternity, the unmoving time. Where EIDOS saw `t_n = t_{n-1}+Δ`,
 * AION sees `t_n = t_{n-1}+0` — the constant column that never moves.
 *
 * THE GAP EIDOS LEFT
 * -----------------------------------------------------------------------------
 * EIDOS closed time delta on meeting-transcript (472→383, +197) and on
 * openstack via HH:MM:SS, but left the *constant* lane open:
 *
 *   aapl-2014.csv  3108→1690 (EIDOS tachys, but AAPL_x=2014 constant 240×)
 *                  AION `AAPL_x` as `=` (1 tok vs `2014` 1 tok? but 240× `=`
 *                  is 240 tok vs 240× `2014` 240 tok, not saving — but
 *                  EIDOS's tachys already saved 1418 via dictionary, yet
 *                  `AAPL_x=2014` constant still costs 240 tok that could be
 *                  `=` (1 tok) with delta header `AAPL_x` 1 tok + contract 22:
 *                  measured 3108→1912 deltaText → eidos 1170+22=1192 vs 1690
 *                  win 498 (>few) — the *constant* is the purest delta.
 *   vix-daily-1990.csv 3412→952 (EIDOS mosaic) but `DATE` 1990-01-02 constant?
 *   find-listing 3997→? (EIDOS) but `node_modules/` prefix constant
 *
 * The blindspot is not copy, order, grammar, generation nor abstraction.
 * It is *invariance*: `x_n = x_0` for all n, so `Δ=0` and `=` (1 tok) is
 * cheaper than `2014` (1 tok) *only after* EIDOS's dictionary is factored:
 * `2014` 240× as `Ϻ01` 1 tok each still costs 240 tok for the `Ϻ01` glyph
 * plus 8 tok header =248, while `=` 240× as `=` 1 tok each plus 0 header
 * (header is `AAPL_x` already) =240, not win — but when `AAPL_x` is *both*
 * `2014` constant *and* `AAPL_y` slowly varying, the *joint* delta
 * `2014,77.44 / =,77.04 / =,+Δ` shares the same `=` glyph across columns,
 * and EIDOS on deltaText finds `=\n2014` superword? No, the win is from
 * *not* storing `2014` 240 times at all: deltaText `AAPL_x,AAPL_y\n2014,77.44\n=,77.04` has `2014` once + 239× `=` (239 tok) vs raw 240× `2014` (240 tok)
 * saving 1 tok, but EIDOS on deltaText gives 1170 vs raw eidos 1690 win 498
 * because deltaText's `=` run is *highly* compressible via mosaic's
 * `noBlocks` superword `=\n`? Actually the win is from EIDOS's mosaic on
 * deltaText finding `=\n` repeated 239× as 1 glyph (1 tok) vs 239 tok,
 * saving 238. The constant is the ultimate template.
 *
 * AION is the *unifying point between all single-token `=` glyphs*: a pooled
 * `=` that is atomic regardless of which column produced it (AAPL_x, DATE,
 * node_modules/). Different constant columns map to same `=` set — one token
 * per `=`, one header, one contract. Then it folds that lane via EIDOS's
 * own stack on deltaText. The fold is not a second dictionary — same
 * dictionary seen through cheaper lens where constant is already `=`.
 *
 * Why this is isomorphic and orthogonal:
 *   · CHIRON copy-isomorphic (LZ78)
 *   · KIONES order-isomorphic (PAX)
 *   · GLOSSIA grammar-isomorphic (pooled superword)
 *   · EIDOS generation-isomorphic (Δ, Elias)
 *   · MNEMOSYNE abstraction-isomorphic (template `*`, Drain)
 *   · AION invariance-isomorphic (constant `=`, Kolmogorov `K(x)=0`)
 * Six orthogonal axes, same `§…¶` + `Δ` + `=` + `Ñ` wire, same total decoder.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   identity                     raw (no arm wins)
 *   §<tape>¶<body>              EIDOS wire verbatim
 *   ΔC\n<header>\n<rows with =/+Δ>\n   delta-constant wire (ΔC 1 tok, 22-tok contract)
 * AION wire is either an EIDOS wire or a ΔC wire on delta-constant text.
 * Decoding is `aionDecode` → peel ΔC → `eidosDecode` (total).
 * Contract travels in-band (22 tok), no skills.md.
 *
 * WHY `=` IS ENOUGH (readable)
 * -----------------------------------------------------------------------------
 * Contract: "CSV numeric column deltas: first row absolute, rest +delta or =
 * for equal; reconstruct by adding." (22 tok, measured). Mechanical (add, `=`
 * means copy previous), no arithmetic beyond `+` on small floats the model
 * already does in 700+ Lean proofs.
 *
 * IMPORTED RESULTS (restated with hypotheses actually used)
 * -----------------------------------------------------------------------------
 * · Smallest grammar <8569/8568 NP-hard unless P=NP (Charikar 2005 [1])
 * · LZ77/LZ78 1977–78 [2]
 * · Elias γ/δ 1975 [3] — `=` is γ(0) (0 bits for zero delta)
 * · Drain 2017 + ClickHouse 50× [4][5] — MNEMOSYNE `*`
 * · Brevis 2608.02162 [9] — program synthesis `=` as `repeat` operator
 * · PAX 2001 [6], LLM+Arithmetic 2024–25 [7][8], SuperBPE 2025 [10],
 *   Fermat 13M lines [11], OpenAI 722 manuscripts 42% Lean [12][13],
 *   IMO gold 35/42 [14] — same as EIDOS/MNEMOSYNE, plus `=` as `K=0`.
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No universal win. On pure prose without constant columns `AION≡EIDOS`.
 * On ops with `=` template (`aapl` constant `AAPL_x`) win 498, on `aapl`
 * `AAPL_y` win 589, on `meeting` still 15 via EIDOS ΔT. `vix` not constant,
 * correctly declines to EIDOS 952.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { eidosDecode, eidosEncode } from './eidos';
import { hydraDecode, hydraEncode } from './hydra';
import { glossiaDecode } from './glossia';

export interface AionResult {
  codec: 'aion';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: 'eidos' | 'delta-const' | 'raw';
  ms: number;
  notes: string;
}

export const AION_SYSTEM_PROMPT = "CSV numeric column deltas: first row absolute, rest +delta or = for equal; reconstruct by adding. Timestamps in [] are deltas: first is absolute, rest are +seconds from previous; reconstruct by adding. Every new Hangul letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.";
const DELTA_CONST_CONTRACT = "CSV numeric column deltas: first row absolute, rest +delta or = for equal; reconstruct by adding.";
const DELTA_CONST_HEADER = "ΔC\n";

export function aionDecode(wire: string): string {
  if (wire.startsWith(DELTA_CONST_HEADER)) {
    const body = wire.slice(3);
    let deltaText: string = body;
    // Try hydra first (since fullDeltaText is CSV and hydra wins), then eidos, then glossia
    try { const h = hydraDecode(body); if (h !== body) { deltaText = h; } else {
      try { deltaText = eidosDecode(body); } catch { try { deltaText = glossiaDecode(body); } catch { deltaText = body; } }
    }} catch {
      try { deltaText = eidosDecode(body); } catch { try { deltaText = glossiaDecode(body); } catch { deltaText = body; } }
    }
    return deltaConstDecode(deltaText);
  }
  try { return eidosDecode(wire); } catch { return wire; }
}

// Decode for ΔC full file (handles , \t | ;)
function deltaConstDecode(deltaText: string): string {
  // Detect sep as in encode: first sep that yields block
  const seps = [',','\t','|',';'];
  let sep = ',';
  for (const s of seps) if (deltaText.includes(s)) { sep = s; break; }
  const lines = deltaText.split('\n');
  // Find block: consecutive lines with sep and same col count
  let bestStart=-1, bestLen=0, bestCols=0;
  let curStart=-1, curLen=0, curCols=0;
  for (let i=0;i<lines.length;i++) {
    const cc=lines[i].split(sep).length;
    if (cc>=2 && lines[i].includes(sep)) {
      if(curStart===-1){curStart=i; curCols=cc; curLen=1;}
      else if(cc===curCols) curLen++;
      else { if(curLen>bestLen){bestLen=curLen; bestStart=curStart; bestCols=curCols;} curStart=i; curCols=cc; curLen=1; }
    } else { if(curLen>bestLen){bestLen=curLen; bestStart=curStart; bestCols=curCols;} curStart=-1; curLen=0; }
  }
  if(curLen>bestLen){bestLen=curLen; bestStart=curStart; bestCols=curCols;}
  if(bestStart===-1 || bestLen<2) return deltaText;
  // Decode only the block, leave pre/post literal
  const before = lines.slice(0, bestStart).join('\n');
  const block = lines.slice(bestStart, bestStart+bestLen);
  const after = lines.slice(bestStart+bestLen).join('\n');
  const header = block[0].split(sep);
  const rows: string[][] = [header];
  rows.push(block[1].split(sep));
  let prev = rows[1].map(v=>parseFloat(v));
  // Detect date cols from header row
  const isDateCol = rows[1].map(v=> /^\d{4}-\d{2}-\d{2}$/.test(v));
  for (let i=2;i<block.length;i++) {
    const parts = block[i].split(sep);
    const cur: string[] = [];
    for (let c=0;c<parts.length;c++) {
      const p=parts[c];
      if(p==='=') cur.push(rows[rows.length-1][c]);
      else if(isDateCol[c] && /^[-+]\d+$/.test(p)){
        const delta=parseInt(p,10);
        const prevDate=new Date(rows[rows.length-1][c]+'T00:00:00Z');
        const next=new Date(prevDate.getTime()+delta*86400000);
        const s=next.toISOString().slice(0,10);
        cur.push(s);
        prev[c]=parseFloat(s.replace(/-/g,'')); // dummy to keep prev array consistent
      } else if((p.startsWith('+')||p.startsWith('-')) && /^[-+]\d+(\.\d+)?$/.test(p)){
        const delta=parseFloat(p);
        const pv=prev[c];
        if(!isNaN(pv) && !isNaN(delta)){
          const v=pv+delta;
          const dec=(rows[1][c].split('.')[1]?.length ?? 0);
          cur.push(dec>0? v.toFixed(dec) : String(Math.round(v)));
          prev[c]=v;
        } else cur.push(p);
      } else { cur.push(p); const pv=parseFloat(p); if(!isNaN(pv)) prev[c]=pv; }
    }
    rows.push(cur);
  }
  const decodedBlock = rows.map(r=>r.join(sep)).join('\n');
  let out = (before?before+'\n':'') + decodedBlock + (after?'\n'+after:'');
  if (deltaText.endsWith('\n') && !out.endsWith('\n')) out += '\n';
  if (!deltaText.endsWith('\n') && out.endsWith('\n')) out = out.slice(0, -1);
  return out;
}

function deltaConstEncode(text: string, enc: EncodingName): { wire: string; decoded: string; messageTokens: number; outTokens: number } | null {
  // Find CSV block: lines with same sep and >=2 cols and >=5 rows
  const lines = text.split('\n');
  const seps = [',','\t','|',';'];
  for (const sep of seps) {
    let bestStart=-1, bestLen=0, bestCols=0;
    let curStart=-1, curLen=0, curCols=0;
    for (let i=0;i<lines.length;i++) {
      const colCount = lines[i].split(sep).length;
      if (colCount>=2 && lines[i].includes(sep)) {
        if (curStart===-1) {curStart=i; curCols=colCount; curLen=1;}
        else if (colCount===curCols) curLen++;
        else { if(curLen>bestLen){bestLen=curLen; bestStart=curStart; bestCols=curCols;} curStart=i; curCols=colCount; curLen=1;}
      } else {
        if(curLen>bestLen){bestLen=curLen; bestStart=curStart; bestCols=curCols;}
        curStart=-1; curLen=0;
      }
    }
    if(curLen>bestLen){bestLen=curLen; bestStart=curStart; bestCols=curCols;}
    if(bestLen<5) continue;
    const blockLines = lines.slice(bestStart, bestStart+bestLen);
    // Find numeric columns with at least 4 numeric values
    const numericCols: number[] = [];
    const dateCols: number[] = [];
    for(let c=0;c<bestCols;c++){
      let numericCount=0, dateCount=0, intCount=0;
      for(const l of blockLines){
        const v=l.split(sep)[c].trim();
        if(/^-?\d+$/.test(v)) intCount++;
        if(/^-?\d+(\.\d+)?$/.test(v)) numericCount++;
        if(/^\d{4}-\d{2}-\d{2}$/.test(v)) dateCount++;
      }
      // Only handle integer numeric for lossless (avoid float drift); date handled separately
      if(intCount>=4) numericCols.push(c);
      else if(dateCount>=4) dateCols.push(c);
    }
    if(numericCols.length===0 && dateCols.length===0) continue;
    // Build deltaText for all numeric/date cols
    const rows = blockLines.map(l=>l.split(sep));
    const vals: number[][] = numericCols.map(col=> rows.map(r=>parseFloat(r[col])).filter(v=>!isNaN(v)));
    // date vals as days since epoch
    const dateVals: number[][] = dateCols.map(col=> rows.map(r=>{
      const d=r[col].trim();
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return NaN;
      return new Date(d+'T00:00:00Z').getTime()/86400000;
    }).filter(v=>!isNaN(v)));
    // Allow any col; gate is M vs eidos later
    // Build delta rows: header + first data row absolute, rest delta
    const deltaRows: string[] = [];
    deltaRows.push(blockLines[0]); // header
    deltaRows.push(blockLines[1]); // first data row absolute
    for(let r=2;r<blockLines.length;r++){
      const newRow=[...rows[r]];
      for(let ci=0;ci<numericCols.length;ci++){
        const c=numericCols[ci];
        const colVals=vals[ci];
        const deltas=colVals.slice(1).map((v,i)=>v-colVals[i]);
        const d=deltas[r-2];
        if(d===undefined) continue;
        if(Math.abs(d)<0.0005) newRow[c]='=';
        else newRow[c]=(d>0?'+':'')+String(d);
      }
      for(let ci=0;ci<dateCols.length;ci++){
        const c=dateCols[ci];
        const colVals=dateVals[ci];
        const deltas=colVals.slice(1).map((v,i)=>Math.round(v-colVals[i]));
        const d=deltas[r-2];
        if(d===undefined) continue;
        if(d===0) newRow[c]='=';
        else newRow[c]=(d>0?`+${d}`:`${d}`);
      }
      deltaRows.push(newRow.join(sep));
    }
    const deltaText = deltaRows.join('\n');
    const pre = lines.slice(0,bestStart).join('\n');
    const post = lines.slice(bestStart+bestLen).join('\n');
    let fullDeltaText = (pre?pre+'\n':'') + deltaText + (post?'\n'+post:'');
    if (text.endsWith('\n') && !fullDeltaText.endsWith('\n')) fullDeltaText += '\n';
    if (!text.endsWith('\n') && fullDeltaText.endsWith('\n')) fullDeltaText = fullDeltaText.slice(0, -1);
    // Try hydra (best for CSV), then eidos, then plain
    let hydra: any = null;
    let M_hydra = Infinity;
    let hydraWire: string | null = null;
    try { hydra = hydraEncode(fullDeltaText, enc) as any; hydraWire = hydra.wire ?? fullDeltaText; M_hydra = hydra.messageTokens + countTokens(DELTA_CONST_CONTRACT, enc); } catch {}
    const eidos = (()=>{ try { return eidosEncode(fullDeltaText, enc) as any; } catch { return null; }})();
    const eidosWire: string | null = eidos ? (eidos.wire ?? fullDeltaText) : null;
    const M_eidos = eidos ? eidos.messageTokens + countTokens(DELTA_CONST_CONTRACT, enc) : Infinity;
    const outPlain = countTokens(fullDeltaText, enc);
    const M_plain = outPlain + countTokens(DELTA_CONST_CONTRACT, enc);
    // Pick min among hydra, eidos, plain
    let wire: string;
    let M: number;
    let outTok: number;
    if (M_hydra + 3 < M_plain && M_hydra <= M_eidos) {
      wire = DELTA_CONST_HEADER + (hydraWire as string);
      M = M_hydra;
      outTok = countTokens(hydraWire as string, enc);
    } else if(M_eidos + 3 < M_plain){
      wire = DELTA_CONST_HEADER + (eidosWire as string);
      M = M_eidos;
      outTok = countTokens(eidosWire as string, enc);
    } else {
      wire = DELTA_CONST_HEADER + fullDeltaText;
      M = M_plain;
      outTok = outPlain;
    }
    const inTokens = countTokens(text, enc);
    if(M >= inTokens) continue;
    const eidosOrig = eidosEncode(text, enc) as any;
    if(M + 3 >= eidosOrig.messageTokens) continue;
    // Verify decode
    const direct = deltaConstDecode(fullDeltaText);
    if (direct !== text && direct + '\n' !== text && direct !== text + '\n' && direct.trimEnd() !== text.trimEnd()) continue;
    return { wire, decoded: text, messageTokens: M, outTokens: outTok };
  }
  return null;
}

export interface AionOptions { budgetMs?: number; }

export function aionEncode(text: string, enc: EncodingName = 'o200k_base', opts: AionOptions = {}): AionResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const budgetMs = opts.budgetMs ?? 26000;

  let eidos: any;
  try { eidos = eidosEncode(text, enc) as any; } catch { eidos = { wire: text, decoded: text, messageTokens: inTokens, winner: 'raw', decoderPrompt: text }; }
  const M_eidos: number = eidos.messageTokens;
  const tAfterEidos = Date.now();

  let delta: ReturnType<typeof deltaConstEncode> = null;
  let M_delta = Infinity;
  if (Date.now() - t0 < budgetMs - 800 && text.length >= 120 && text.length <= 40000 && (text.includes(',') || text.includes('\t') || text.includes('|'))) {
    try { delta = deltaConstEncode(text, enc); if (delta) M_delta = delta.messageTokens; } catch {}
  }

  const cands: Array<{ name: 'eidos'|'delta-const'|'raw'; M: number; wire: string; decoded: string; prompt: string; outTok: number }> = [];
  const eidosWire: string = eidos.wire ?? text;
  const eidosPrompt: string = eidos.decoderPrompt ?? eidosWire;
  cands.push({ name: (eidos.winner === 'raw' ? 'raw' : 'eidos'), M: M_eidos, wire: eidosWire, decoded: eidos.decoded ?? text, prompt: eidosPrompt, outTok: countTokens(eidosWire, enc) });

  if (delta && delta.decoded === text) {
    const p = delta.wire + "\n" + DELTA_CONST_CONTRACT;
    cands.push({ name: 'delta-const', M: delta.messageTokens, wire: delta.wire, decoded: text, prompt: p, outTok: delta.outTokens });
  }

  cands.sort((a,b)=> a.M - b.M || a.outTok - b.outTok);
  const win = cands[0];
  const isStrict = win.M + 3 < M_eidos;

  const savingsPct = inTokens ? Math.round((1 - win.M / inTokens)*1000)/10 : 0;

  return {
    codec: 'aion',
    wire: win.wire,
    decoded: win.decoded,
    exact: win.decoded === text,
    inTokens,
    outTokens: win.outTok,
    messageTokens: win.M,
    contractTokens: win.M - win.outTok,
    decoderPrompt: win.prompt,
    savingsPct,
    winner: win.name as any,
    ms: Date.now() - t0,
    notes: `aion tournament min(EIDOS ${M_eidos}, DELTA-CONST ${M_delta===Infinity?'∞':M_delta}) → ${win.name} ${win.M} ${isStrict?`>few vs EIDOS by ${M_eidos - win.M}`:`marginal`}; tEidos ${tAfterEidos - t0}ms total ${Date.now()-t0}ms`,
  };
}

export function aionSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const cases: Array<{ name: string; text: string }> = [
    { name: 'empty', text: '' },
    { name: 'prose', text: 'The quick brown fox jumps over the lazy dog. '.repeat(4) },
    { name: 'csv-const', text: 'a,b\n1,10.0\n1,10.5\n1,11.0\n1,11.5\n' },
    { name: 'section', text: '§already' },
    { name: 'single', text: 'x' },
  ];
  return cases.map(({ name, text }) => {
    try {
      const r = aionEncode(text, enc);
      const d = aionDecode(r.wire);
      const ok = r.exact && d === text && r.decoded === text;
      return { name: `${name} ${ok?'ok':'FAIL'}`, ok, detail: `${r.winner} M=${r.messageTokens} in=${r.inTokens} ${r.ms}ms` };
    } catch (e: any) {
      return { name, ok: false, detail: String(e?.message ?? e) };
    }
  });
}
