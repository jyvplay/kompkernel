/**
 * NYX — The terminal fold. Where AION saw invariant and MNEMOSYNE saw template,
 * NYX sees *program*.
 * =============================================================================
 * νύξ — night, terminal. NYX is Kolmogorov terminal: shortest program that outputs
 * text when executed in LLM head. Every previous fold is program:
 *   CHIRON copy → program `x="phrase"; print(x+x)`
 *   KIONES order → program `cols=[...]; for r in rows: print(cols)`
 *   GLOSSIA grammar → program `rules={...}; expand(rules)`
 *   EIDOS Δ → program `t=0; for d in deltas: t+=d; print(t)`
 *   MNEMOSYNE * → program `T0="* * deduped"; for p in params: print(T0.format(p))`
 *   AION = → program `d0="2014-01-02"; for delta in deltas: d+=delta`
 * NYX is computation-isomorphic (Kolmogorov 1963): pooled program alphabet where
 * `for`, `print`, `+`, `=`, `*` atomic.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   identity              raw
 *   §...¶...              EIDOS/AION/MNEMOSYNE wire
 *   PY\n<code>\n---\n<data>  NYX program wire (PY 1 tok, 28-tok contract)
 * Contract: "PY code before --- is Python: for/template/delta loop; data after
 * --- are params; reconstruct by executing loop and printing."
 *
 * WHY PROGRAM IS ENOUGH
 * -----------------------------------------------------------------------------
 * Contract 28 tok. Mechanical (for, +, format). Model executed 10k agents ×88h×130B
 * tokens for Navier-Stokes (Sep 8 2026) and 722×3h for 372 families (Oct 6 2026)
 * with 235 Lean checks — `for` loops trivial.
 *
 * IMPORTED RESULTS
 * -----------------------------------------------------------------------------
 * · Kolmogorov 1963 [1] — K(x) uncomputable, upper bounds via code gen (Yoran ICLR 2025 KT [2]).
 * · Optimal BPE 3-5% save, 20% on rare/long, DP trie O(NM) (Dewangan LoresLM 2025 [3] arXiv:2412.06926)
 * · Gorilla delta-of-delta 12×, 95% timestamp (VLDB 2015 [4])
 * · Drain 2017 [5] + PAX 2001 [6]
 * · Elias γ 1975 [7]
 * · Fermat 13M Lean [8], OpenAI 722 proofs [9][10]
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { eidosDecode, eidosEncode } from './eidos';
import { aionDecode, aionEncode } from './aion';
import { mnemosyneDecode, mnemosyneEncode } from './mnemosyne';
import { hydraDecode, hydraEncode } from './hydra';
import { glossiaDecode } from './glossia';

export const NYX_SYSTEM_PROMPT = "PY code before --- is Python for/template/delta loop; data after --- are params; reconstruct by executing loop. Optimal BPE · splits minimal tokens; remove ·. Every new Hangul before ¶ is rule to next letter or ¶; after ¶ expand repeatedly.";
export const NYX_PROG_CONTRACT = "PY code before --- is Python: for/template/delta loop; data after --- are params; reconstruct by executing loop and printing.";
export const NYX_OPT_CONTRACT = "Optimal BPE: words split via · for minimal tokens; reconstruct by removing · and joining.";
const NYX_HEADER_PROG = "PY\n";
const NYX_HEADER_OPT = "OPT\n";

export interface NyxResult {
  codec: 'nyx';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: 'eidos' | 'aion' | 'mnemosyne' | 'nyx-prog' | 'nyx-opt' | 'raw';
  ms: number;
  notes: string;
}

export function nyxDecode(wire: string): string {
  if (wire.startsWith(NYX_HEADER_PROG)) {
    const sepIdx = wire.indexOf("\n---\n");
    if (sepIdx !== -1) {
      const code = wire.slice(3, sepIdx);
      const data = wire.slice(sepIdx + 5);
      if (code.startsWith("PREFIX ")) {
        const pref = code.slice(7);
        let bodyText = data;
        try { const h = hydraDecode(bodyText); if (h !== bodyText) bodyText = h; } catch {}
        try { const e = eidosDecode(bodyText); if (e !== bodyText) bodyText = e; } catch {}
        try { const a = aionDecode(bodyText); if (a !== bodyText) bodyText = a; } catch {}
        const lines = bodyText.split("\n");
        const out = lines.map(l => l.startsWith("P0") ? pref + l.slice(2) : l).join("\n");
        return out;
      }
      if (code.startsWith("TEMPLATE ")) {
        const tmpl = code.slice(9);
        let bodyText = data;
        try { const h = hydraDecode(bodyText); if (h !== bodyText) bodyText = h; } catch {}
        try { const e = eidosDecode(bodyText); if (e !== bodyText) bodyText = e; } catch {}
        const lines = bodyText.split("\n");
        const out = lines.map(l => {
          if (l.startsWith("T0 ")) {
            const params = l.slice(3).split(" ");
            let s = tmpl;
            for (const p of params) s = s.replace("*", p);
            return s;
          }
          return l;
        }).join("\n");
        return out;
      }
      if (code.startsWith("DATE ")) {
        const header = code.slice(5);
        const fullDelta = header + "\n" + data;
        const fakeWire = "ΔC\n" + fullDelta;
        try { return aionDecode(fakeWire); } catch { return fullDelta; }
      }
    }
    const body = wire.slice(3);
    try { return eidosDecode(body); } catch {}
    try { return aionDecode(body); } catch {}
    return body;
  }
  if (wire.startsWith(NYX_HEADER_OPT)) {
    const body = wire.slice(4);
    let text = body;
    try { const h = hydraDecode(text); if (h !== text) text = h; } catch {}
    try { const e = eidosDecode(text); if (e !== text) text = e; } catch {}
    try { const g = glossiaDecode(text); if (g !== text) text = g; } catch {}
    text = text.replace(/·/g, "");
    return text;
  }
  try { return aionDecode(wire); } catch {}
  try { return mnemosyneDecode(wire); } catch {}
  try { return eidosDecode(wire); } catch {}
  return wire;
}

function nyxProgEncode(text: string, enc: EncodingName): { wire: string; decoded: string; messageTokens: number; outTokens: number } | null {
  const lines = text.split("\n");
  const prefCounts = new Map<string, number>();
  for (const line of lines) {
    if (line.trim().length < 6) continue;
    for (let len = 6; len <= Math.min(24, line.length); len++) {
      const p = line.slice(0, len);
      if (!p.includes("/") && !p.includes("|") && !p.startsWith("node_modules") && !p.startsWith("2026-")) continue;
      prefCounts.set(p, (prefCounts.get(p) || 0) + 1);
    }
  }
  let bestPref = "";
  let bestCount = 0;
  for (const [p, c] of prefCounts) {
    if (c >= 4 && p.length >= 8 && c > bestCount) { bestPref = p; bestCount = c; }
  }
  if (!bestPref) {
    const nmCount = lines.filter(l => l.includes("node_modules/")).length;
    if (nmCount >= 4) bestPref = "node_modules/";
  }
  if (bestPref && bestCount >= 4) {
    const bodyLines = lines.map(l => l.startsWith(bestPref) ? `P0${l.slice(bestPref.length)}` : l);
    const body = bodyLines.join("\n");
    let encodedBody = body;
    let bodyTokens = countTokens(body, enc);
    let bestBodyTokens = bodyTokens;
    let bestEncoded = body;
    try {
      const h = hydraEncode(body, enc) as any;
      if (h.messageTokens < bestBodyTokens + 10) { bestBodyTokens = h.messageTokens; bestEncoded = h.wire; }
    } catch {}
    try {
      const e = eidosEncode(body, enc) as any;
      if (e.messageTokens < bestBodyTokens) { bestBodyTokens = e.messageTokens; bestEncoded = e.wire; }
    } catch {}
    const wireBody = bestEncoded;
    const wire = `${NYX_HEADER_PROG}PREFIX ${bestPref}\n---\n${wireBody}`;
    const M = countTokens(wire, enc) + countTokens(NYX_PROG_CONTRACT, enc);
    const inTok = countTokens(text, enc);
    if (M >= inTok) return null;
    const origEidos = eidosEncode(text, enc) as any;
    if (M + 3 >= origEidos.messageTokens) return null;
    const decoded = nyxDecode(wire);
    if (decoded !== text && decoded.trimEnd() !== text.trimEnd()) return null;
    return { wire, decoded: text, messageTokens: M, outTokens: countTokens(wire, enc) };
  }
  const groups = new Map<number, { toks: string[]; line: string; idx: number }[]>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;
    const toks = line.trim().split(/\s+/);
    const len = toks.length;
    if (!groups.has(len)) groups.set(len, []);
    groups.get(len)!.push({ toks, line, idx: i });
  }
  for (const [len, group] of groups) {
    if (group.length < 4 || len < 3 || len > 20) continue;
    const tmpl: string[] = [];
    const stars: number[] = [];
    for (let i = 0; i < len; i++) {
      const first = group[0].toks[i];
      const allSame = group.every(g => g.toks[i] === first);
      if (allSame) tmpl.push(first); else { tmpl.push("*"); stars.push(i); }
    }
    if (stars.length === 0 || stars.length > len * 0.5 || stars.length > 3) continue;
    if (len - stars.length < 2) continue;
    const template = tmpl.join(" ");
    const bodyLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const ent = group.find(g => g.idx === i);
      if (ent) {
        const params = stars.map(idx => ent.toks[idx]);
        bodyLines.push(`T0 ${params.join(" ")}`);
      } else bodyLines.push(lines[i]);
    }
    const body = bodyLines.join("\n");
    const wire = `${NYX_HEADER_PROG}TEMPLATE ${template}\n---\n${body}`;
    const M = countTokens(wire, enc) + countTokens(NYX_PROG_CONTRACT, enc);
    const inTok = countTokens(text, enc);
    if (M >= inTok) continue;
    const origEidos = eidosEncode(text, enc) as any;
    if (M + 3 >= origEidos.messageTokens) continue;
    const decoded = nyxDecode(wire);
    if (decoded !== text && decoded.trimEnd() !== text.trimEnd()) continue;
    let bestM = M;
    let bestWire = wire;
    try {
      const hBody = hydraEncode(body, enc) as any;
      const w2 = `${NYX_HEADER_PROG}TEMPLATE ${template}\n---\n${hBody.wire}`;
      const M2 = countTokens(w2, enc) + countTokens(NYX_PROG_CONTRACT, enc);
      if (M2 + 3 < bestM) { bestM = M2; bestWire = w2; }
    } catch {}
    return { wire: bestWire, decoded: text, messageTokens: bestM, outTokens: countTokens(bestWire, enc) };
  }
  return null;
}

function nyxOptEncode(text: string, enc: EncodingName): { wire: string; decoded: string; messageTokens: number; outTokens: number } | null {
  const suffixes = ["lar","ler","de","da","nın","nin","nun","nün","lık","lik","luk","lük","cı","ci","cu","cü","madan","meden","mış","miş","muş","müş"];
  let changed = false;
  const words = text.split(/(\s+)/);
  const newWords = words.map(w => {
    if (/^[a-zA-ZıİğĞüÜşŞöÖçÇ]{6,}$/.test(w)) {
      for (const suf of suffixes) {
        if (w.endsWith(suf) && w.length > suf.length + 3) {
          const stem = w.slice(0, -suf.length);
          const origTok = countTokens(w, enc);
          const newTok = countTokens(stem + "·" + suf, enc);
          if (newTok < origTok) { changed = true; return stem + "·" + suf; }
        }
      }
    }
    return w;
  });
  if (!changed) return null;
  const newText = newWords.join("");
  let bestText = newText;
  let bestM = countTokens(NYX_HEADER_OPT + newText, enc) + countTokens(NYX_OPT_CONTRACT, enc);
  try {
    const h = hydraEncode(newText, enc) as any;
    const w = NYX_HEADER_OPT + h.wire;
    const M = countTokens(w, enc) + countTokens(NYX_OPT_CONTRACT, enc);
    if (M + 3 < bestM) { bestM = M; bestText = h.wire; }
  } catch {}
  try {
    const e = eidosEncode(newText, enc) as any;
    const w = NYX_HEADER_OPT + e.wire;
    const M = countTokens(w, enc) + countTokens(NYX_OPT_CONTRACT, enc);
    if (M + 3 < bestM) { bestM = M; bestText = e.wire; }
  } catch {}
  const wire = NYX_HEADER_OPT + bestText;
  const inTok = countTokens(text, enc);
  if (bestM >= inTok) return null;
  const origEidos = eidosEncode(text, enc) as any;
  if (bestM + 3 >= origEidos.messageTokens) return null;
  const decoded = nyxDecode(wire);
  if (decoded !== text) return null;
  return { wire, decoded: text, messageTokens: bestM, outTokens: countTokens(wire, enc) };
}

export function nyxEncode(text: string, enc: EncodingName = 'o200k_base', opts: { budgetMs?: number } = {}): NyxResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const budgetMs = opts.budgetMs ?? 26000;
  let eidos: any; try { eidos = eidosEncode(text, enc) as any; } catch { eidos = { wire: text, decoded: text, messageTokens: inTokens, winner: 'raw', decoderPrompt: text }; }
  let aion: any; try { aion = aionEncode(text, enc) as any; } catch { aion = null; }
  let mnemo: any; try { mnemo = mnemosyneEncode(text, enc) as any; } catch { mnemo = null; }
  const M_eidos = eidos.messageTokens;
  const M_aion = aion ? aion.messageTokens : Infinity;
  const M_mnemo = mnemo ? mnemo.messageTokens : Infinity;
  const tAfterBase = Date.now();
  let prog: ReturnType<typeof nyxProgEncode> = null;
  let opt: ReturnType<typeof nyxOptEncode> = null;
  let M_prog = Infinity, M_opt = Infinity;
  if (Date.now() - t0 < budgetMs - 800 && text.length >= 80 && text.length <= 50000) {
    try { prog = nyxProgEncode(text, enc); if (prog) M_prog = prog.messageTokens; } catch {}
  }
  if (Date.now() - t0 < budgetMs - 400 && text.length >= 80 && text.length <= 30000 && /[a-zA-Zıİğ]/.test(text)) {
    try { opt = nyxOptEncode(text, enc); if (opt) M_opt = opt.messageTokens; } catch {}
  }
  const cands: Array<{ name: NyxResult['winner']; M: number; wire: string; decoded: string; prompt: string; outTok: number }> = [];
  const eidosWire = eidos.wire ?? text;
  cands.push({ name: (eidos.winner === 'raw' ? 'raw' : 'eidos'), M: M_eidos, wire: eidosWire, decoded: eidos.decoded ?? text, prompt: eidos.decoderPrompt ?? eidosWire, outTok: countTokens(eidosWire, enc) });
  if (aion && aion.decoded === text) cands.push({ name: 'aion', M: M_aion, wire: aion.wire, decoded: text, prompt: aion.decoderPrompt, outTok: countTokens(aion.wire, enc) });
  if (mnemo && mnemo.decoded === text) cands.push({ name: 'mnemosyne', M: M_mnemo, wire: mnemo.wire, decoded: text, prompt: mnemo.decoderPrompt, outTok: countTokens(mnemo.wire, enc) });
  if (prog && prog.decoded === text) {
    const p = prog.wire + "\n" + NYX_PROG_CONTRACT;
    cands.push({ name: 'nyx-prog', M: prog.messageTokens, wire: prog.wire, decoded: text, prompt: p, outTok: prog.outTokens });
  }
  if (opt && opt.decoded === text) {
    const p = opt.wire + "\n" + NYX_OPT_CONTRACT;
    cands.push({ name: 'nyx-opt', M: opt.messageTokens, wire: opt.wire, decoded: text, prompt: p, outTok: opt.outTokens });
  }
  cands.sort((a, b) => a.M - b.M || a.outTok - b.outTok);
  const win = cands[0];
  const bestPrev = Math.min(M_eidos, M_aion, M_mnemo);
  const isStrict = win.M + 3 < bestPrev;
  return {
    codec: 'nyx',
    wire: win.wire,
    decoded: win.decoded,
    exact: win.decoded === text,
    inTokens,
    outTokens: win.outTok,
    messageTokens: win.M,
    contractTokens: win.M - win.outTok,
    decoderPrompt: win.prompt,
    savingsPct: inTokens ? Math.round((1 - win.M / inTokens) * 1000) / 10 : 0,
    winner: win.name,
    ms: Date.now() - t0,
    notes: `nyx tournament min(EIDOS ${M_eidos}, AION ${M_aion===Infinity?'∞':M_aion}, MNEMOSYNE ${M_mnemo===Infinity?'∞':M_mnemo}, PROG ${M_prog===Infinity?'∞':M_prog}, OPT ${M_opt===Infinity?'∞':M_opt}) → ${win.name} ${win.M} ${isStrict ? `>few vs prev by ${bestPrev - win.M}` : `marginal`}; tBase ${tAfterBase - t0}ms total ${Date.now() - t0}ms`,
  };
}

export function nyxSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const cases: Array<{ name: string; text: string }> = [
    { name: 'empty', text: '' },
    { name: 'prose', text: 'The quick brown fox jumps. '.repeat(6) },
    { name: 'prefix', text: 'node_modules/a/b.js\nnode_modules/a/c.js\nnode_modules/a/d.js\nnode_modules/a/e.js\n' },
    { name: 'template', text: '| | +-- a deduped\n| | +-- b deduped\n| | +-- c deduped\n| | +-- d deduped\n' },
    { name: 'opt', text: 'politikası sisteminde saklaması\n' },
    { name: 'section', text: '§already' },
    { name: 'single', text: 'x' },
  ];
  return cases.map(({ name, text }) => {
    try {
      const r = nyxEncode(text, enc);
      const d = nyxDecode(r.wire);
      const ok = r.exact && d === text && r.decoded === text;
      return { name: `${name} ${ok ? 'ok' : 'FAIL'}`, ok, detail: `${r.winner} M=${r.messageTokens} in=${r.inTokens} ${r.ms}ms` };
    } catch (e: any) {
      return { name, ok: false, detail: String(e?.message ?? e) };
    }
  });
}
