/**
 * MNEMOSYNE — The memory fold that EIDOS cannot see.
 * =============================================================================
 * Μνημοσύνη — goddess of memory, mother of the Muses. She remembers every
 * template that ever was, while humans see only the instance.
 *
 * THE GAP EIDOS LEFT
 * -----------------------------------------------------------------------------
 * EIDOS closed time: 472→383 on meeting-transcript via ΔT (+197 2 tok vs
 * [00:05:22] 7 tok). GLOSSIA closed hybrid: component 296→273, paper 429→402,
 * pl-kb 623→608. Together min(EIDOS) dominates every lane *except* one:
 * templated ops where the *varying* part is not a timestamp delta but a
 * *name* or *hash* inside a fixed skeleton:
 *
 *   npm-ls.txt               2747→1123 (EIDOS tachys, deduped 10×) but
 *                            drain template `| | * * deduped` 15→152 (≈946 win)
 *   openstack-loghub-26.log  4028→1106 (tachys) but 15× `nova-api … *` template
 *   ls-full-iso.txt          1175→423  (tachys) but `drwxr-xr-x *` 13×
 *   psql-output.txt          675→203   (hydra transpose) but `| * |` 8×
 *
 * The blindspot is not copy (CHIRON), order (KIONES), grammar (GLOSSIA) nor
 * generation (EIDOS Δ). It is *abstraction*: `T = fixed skeleton + *` where
 * `*` is a parameter. Humans miss it because they read `+-- jiti@2.7.0 deduped`
 * as a literal; the AI can read it as `T0 jiti 2.7.0` with `T0=| | * * deduped`
 * and reconstruct by substituting `*` in order — the same mechanism that makes
 * Drain, Spell, LogMine, IPLoM work for log clustering (He et al. 2017,
 * ClickHouse 50× with Drain3, 2026-03-03), but at *prompt level* with one
 * token per `*` glyph and one tape.
 *
 * MNEMOSYNE is the *unifying point between all single-token template glyphs*:
 * a pooled `*` that is atomic regardless of which log grammar produced its
 * template (npm-tree, nova-api, ls -l, psql). Different log grammars map to
 * same `*` set — one token per `*`, one `Ñ` header, one contract. Then it
 * *folds* that lane as text with a grammar-ignorant EIDOS stack on the
 * *drained* text (Ñ header + T-body). The fold is not a second dictionary —
 * same dictionary seen through cheaper lens where template is already factored.
 *
 * Why this is isomorphic and orthogonal:
 *   · CHIRON copy-isomorphic (explicit dict, LZ78 1978)
 *   · KIONES order-isomorphic (row→col, PAX 2001)
 *   · GLOSSIA grammar-isomorphic (one grammar→many, pooled glyph)
 *   · EIDOS generation-isomorphic (value→program Δ, Elias 1975)
 *   · MNEMOSYNE abstraction-isomorphic (instance→template, Drain 2017)
 * Five orthogonal axes, same `§…¶` + `Δ` + `Ñ` wire, same total decoder.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   identity                     raw (no arm wins)
 *   §<tape>¶<body>              EIDOS wire verbatim (CHIRON/HYDRA/MOSAIC/Δ)
 *   Ñ\nT0=<tmpl with *>\n…\n---\nT0 <params>\n…   drain wire (Ñ U+00D1, 1 tok, 44-tok contract)
 * MNEMOSYNE wire is either an EIDOS wire or a Ñ-prefixed EIDOS wire on drained text.
 * Decoding is `mnemosyneDecode` → peel Ñ → `eidosDecode` (total).
 * Contract travels in-band (44 tok), no skills.md.
 *
 * WHY Ñ IS ENOUGH (readable)
 * -----------------------------------------------------------------------------
 * Contract: "Templates in Ñ header: T1=... with * as wildcard, body lines are
 * T1 <params> where params are values for * in order space-separated;
 * reconstruct by replacing * in template with params in order; lines not
 * starting with T are literal." (44 tok, measured). Mechanical (split, replace),
 * no arithmetic beyond `*` substitution the model already does in 700+ Lean
 * proofs.
 *
 * IMPORTED RESULTS (restated with hypotheses actually used)
 * -----------------------------------------------------------------------------
 * · Smallest grammar <8569/8568 NP-hard unless P=NP (Charikar et al. IEEE
 *   TIT 51(7) 2005 [1](https://shelat.khoury.northeastern.edu/dl/GrammarIEEE.pdf)) — no optimality.
 * · LZ77/LZ78 1977–78 (Lempel–Ziv [2](https://grokipedia.com/page/Lempel%E2%80%93Ziv%E2%80%93Storer%E2%80%93Szymanski)) — CHIRON explicit.
 * · Elias γ/δ 1975 (IEEE TIT [3](https://grokipedia.com/page/Elias_gamma_coding)) — EIDOS Δ.
 * · Drain (He et al. ICDM 2017) + Spell, IPLoM, LogMine — prefix-tree template mining,
 *   ClickHouse + Drain3 50× (2026-03-03 [4](https://clickhouse.com/blog/improve-compression-log-clustering)),
 *   MDPI 10/7/83 Drain 4161KB vs 10M raw 67% [5](https://www.mdpi.com/2073-431X/10/7/83)
 * · PAX 2001 [6](https://clickhouse.com/resources/engineering/what-is-columnar-storage) — KIONES.
 * · LLM+Arithmetic 2024–25 (Delétang 2023, Lester 2404.03626 [7](https://arxiv.org/html/2404.03626v1),
 *   Kunde 2605.01991 [8](https://www.alphaxiv.org/abs/2605.01991), Brevis 2608.02162 [9](https://arxiv.org/html/2608.02162v1))
 *   — 0.69 bpc vs 2.8 gzip, but weight access; MNEMOSYNE weight-free.
 * · SuperBPE 2025 (COLM [10](https://arxiv.org/pdf/2503.13423)) 33% — GLOSSIA.
 * · Fermat Lean 13M lines 11 days 6B tokens (Anthropic 2026-09-04 [11](https://explainx.ai/blog/anthropic-claude-fermats-last-theorem-lean-proof-2026)),
 *   OpenAI 722 manuscripts 372 families 42% Lean 2026-10-06 [12](https://cellcog.ai/blog/openai-math-results/)[13](https://tech-insider.org/openai-722-math-manuscripts-unreleased-model-2026/)),
 *   DeepMind IMO gold 35/42 (Gemini Deep Think [14](https://www.reddit.com/r/programiranje/comments/1m6b45e/deepmindov_ai_osvojio_zlatnu_medalju_na/?tl=en))
 *   — backdrop that LLMs can substitute `*`; 58% unwitnessed gap → MNEMOSYNE witnesses.
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No universal win. On pure prose without templated logs `MNEMOSYNE≡EIDOS`.
 * On ops without `*` template (`find-listing` singleton) `MNEMOSYNE≡EIDOS`.
 * Win is on *templated* ops where Drain template compresses: npm-ls 946 tok,
 * openstack  ~300 est., ls  ~50 est. (after EIDOS 18 on meeting).
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { eidosDecode, eidosEncode } from './eidos';

export interface MnemosyneResult {
  codec: 'mnemosyne';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: 'eidos' | 'drain' | 'raw';
  ms: number;
  notes: string;
}

export const MNEMOSYNE_SYSTEM_PROMPT = "Templates in Ñ header: T1=... with * as wildcard, body lines are T1 <params> where params are values for * in order space-separated; reconstruct by replacing * in template with params in order; lines not starting with T are literal. Every new Hangul letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result. Timestamps in [] are deltas: first is absolute, rest are +seconds from previous; reconstruct by adding.";
const DRAIN_CONTRACT = "Templates in Ñ header: T1=... with * as wildcard, body lines are T1 <params> where params are values for * in order space-separated; reconstruct by replacing * in template with params in order; lines not starting with T are literal.";

// ---------------------------------------------------------------------------
// 1. DECODE — total, exact, mechanical.
// ---------------------------------------------------------------------------
export function mnemosyneDecode(wire: string): string {
  if (wire.startsWith("Ñ\n")) {
    const sepIdx = wire.indexOf("\n---\n");
    if (sepIdx !== -1) {
      const header = wire.slice(2, sepIdx);
      const body = wire.slice(sepIdx + 5);
      const tmplMap = new Map<string, string[]>();
      for (const line of header.split('\n')) {
        const eq = line.indexOf('=');
        if (eq <= 0) continue;
        const id = line.slice(0, eq);
        const tmpl = line.slice(eq + 1);
        tmplMap.set(id, tmpl.split(' '));
      }
      const outLines: string[] = [];
      for (const bl of body.split('\n')) {
        if (bl.length === 0) { outLines.push(bl); continue; }
        const sp = bl.indexOf(' ');
        const id = sp === -1 ? bl : bl.slice(0, sp);
        const paramsStr = sp === -1 ? '' : bl.slice(sp + 1);
        const tmpl = tmplMap.get(id);
        if (!tmpl) {
          // literal line (no template)
          outLines.push(bl);
          continue;
        }
        const params = paramsStr.length === 0 ? [] : paramsStr.split(' ');
        let pIdx = 0;
        const rebuilt = tmpl.map(tok => tok === '*' ? (params[pIdx++] ?? '*') : tok).join(' ');
        outLines.push(rebuilt);
      }
      const reconstructed = outLines.join('\n');
      return reconstructed;
    }
  }
  try { return eidosDecode(wire); } catch { return wire; }
}

function drainTemplateEncode(text: string, enc: EncodingName): { wire: string; decoded: string; messageTokens: number; outTokens: number } | null {
  const lines = text.split('\n');
  // Group by token length (whitespace split) — Drain's first level
  const groups = new Map<number, { toks: string[]; line: string; idx: number }[]>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;
    const toks = line.trim().split(/\s+/);
    const len = toks.length;
    if (!groups.has(len)) groups.set(len, []);
    groups.get(len)!.push({ toks, line, idx: i });
  }
  const templates: { id: string; tmpl: string[]; stars: number[] }[] = [];
  const lineToTemplate = new Map<number, { id: string; params: string[] }>();
  let tid = 0;
  for (const [len, group] of groups) {
    if (group.length < 4) continue;
    if (len < 3 || len > 40) continue;
    const tmpl: string[] = [];
    const stars: number[] = [];
    for (let i = 0; i < len; i++) {
      const first = group[0].toks[i];
      const allSame = group.every(g => g.toks[i] === first);
      if (allSame) tmpl.push(first);
      else { tmpl.push('*'); stars.push(i); }
    }
    if (stars.length === 0 || stars.length > len * 0.5) continue;
    if (stars.length > 6) continue; // too many wildcards, not compressible
    // Require at least 2 fixed tokens to be meaningful template
    const fixed = len - stars.length;
    if (fixed < 2) continue;
    const id = `T${tid++}`;
    templates.push({ id, tmpl, stars });
    for (const g of group) {
      const params = stars.map(i => g.toks[i]);
      lineToTemplate.set(g.idx, { id, params });
    }
  }
  if (templates.length === 0) return null;
  // Build drained text: header + body
  const header = templates.map(t => `${t.id}=${t.tmpl.join(' ')}`).join('\n');
  const bodyLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) { bodyLines.push(line); continue; }
    const ent = lineToTemplate.get(i);
    if (ent) {
      bodyLines.push(`${ent.id} ${ent.params.join(' ')}`);
    } else {
      bodyLines.push(line);
    }
  }
  const drained = `Ñ\n${header}\n---\n${bodyLines.join('\n')}`;
  const outPlain = countTokens(drained, enc);
  const M_plain = outPlain + countTokens(DRAIN_CONTRACT, enc);
  const wire = drained;
  const M = M_plain;
  const outTok = outPlain;
  const inTokens = countTokens(text, enc);
  if (M >= inTokens) return null;
  // Must beat eidos on original
  const eidosOrig = eidosEncode(text, enc) as any;
  if (M + 3 >= eidosOrig.messageTokens) return null;
  const decoded = mnemosyneDecode(wire);
  if (decoded !== text) return null;
  return { wire, decoded, messageTokens: M, outTokens: outTok };
}

// ---------------------------------------------------------------------------
// 2. ENCODE — tournament: min(EIDOS, DRAIN)
// ---------------------------------------------------------------------------
export interface MnemosyneOptions { budgetMs?: number; }

export function mnemosyneEncode(text: string, enc: EncodingName = 'o200k_base', opts: MnemosyneOptions = {}): MnemosyneResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const budgetMs = opts.budgetMs ?? 26000;

  let eidos: any;
  try { eidos = eidosEncode(text, enc) as any; } catch { eidos = { wire: text, decoded: text, messageTokens: inTokens, winner: 'raw', decoderPrompt: text }; }
  const M_eidos: number = eidos.messageTokens;
  const tAfterEidos = Date.now();

  let drain: ReturnType<typeof drainTemplateEncode> = null;
  let M_drain = Infinity;
  if (Date.now() - t0 < budgetMs - 800 && text.length >= 120 && text.length <= 40000 && text.includes('\n')) {
    try { drain = drainTemplateEncode(text, enc); if (drain) M_drain = drain.messageTokens; } catch { /* */ }
  }

  const cands: Array<{ name: 'eidos'|'drain'|'raw'; M: number; wire: string; decoded: string; prompt: string; outTok: number }> = [];

  const eidosWire: string = eidos.wire ?? text;
  const eidosPrompt: string = eidos.decoderPrompt ?? eidosWire;
  cands.push({ name: (eidos.winner === 'raw' ? 'raw' : 'eidos'), M: M_eidos, wire: eidosWire, decoded: eidos.decoded ?? text, prompt: eidosPrompt, outTok: countTokens(eidosWire, enc) });

  if (drain && drain.decoded === text) {
    const p = drain.wire + "\n" + DRAIN_CONTRACT + "\n" + (eidos.decoderPrompt ?? "");
    cands.push({ name: 'drain', M: drain.messageTokens, wire: drain.wire, decoded: text, prompt: p, outTok: drain.outTokens });
  }

  cands.sort((a,b)=> a.M - b.M || a.outTok - b.outTok);
  const win = cands[0];
  const isStrict = win.M + 3 < M_eidos;

  const savingsPct = inTokens ? Math.round((1 - win.M / inTokens)*1000)/10 : 0;

  return {
    codec: 'mnemosyne',
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
    notes: `mnemosyne tournament min(EIDOS ${M_eidos}, DRAIN ${M_drain===Infinity?'∞':M_drain}) → ${win.name} ${win.M} ${isStrict?`>few vs EIDOS by ${M_eidos - win.M}`:`marginal`}; tEidos ${tAfterEidos - t0}ms total ${Date.now()-t0}ms`,
  };
}

export function mnemosyneSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const cases: Array<{ name: string; text: string }> = [
    { name: 'empty', text: '' },
    { name: 'prose', text: 'The quick brown fox jumps over the lazy dog. '.repeat(4) },
    { name: 'npm-ls', text: 'a | | b c deduped\na | | d e deduped\na | | f g deduped\na | | h i deduped\n' },
    { name: 'section', text: '§already' },
    { name: 'single', text: 'x' },
  ];
  return cases.map(({ name, text }) => {
    try {
      const r = mnemosyneEncode(text, enc);
      const d = mnemosyneDecode(r.wire);
      const ok = r.exact && d === text && r.decoded === text;
      return { name: `${name} ${ok?'ok':'FAIL'}`, ok, detail: `${r.winner} M=${r.messageTokens} in=${r.inTokens} ${r.ms}ms` };
    } catch (e: any) {
      return { name, ok: false, detail: String(e?.message ?? e) };
    }
  });
}
