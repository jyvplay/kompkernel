/**
 * src/lib/omega/stencil.ts
 * =============================================================================
 * OMEGA-STENCIL (⌘) — LLM-READABLE TEMPLATE INDUCTION CODEC
 * Integrated from user-provided spec with no semantic changes.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';

export interface StencilTemplate {
  id: string;
  parts: string[];
  slotCount: number;
  uses: number;
  tokensSaved: number;
}

export interface StencilResult {
  wire: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  encoding: EncodingName;
  inTokens: number;
  outTokens: number;
  savedTokens: number;
  savingsPct: number;
  inChars: number;
  outChars: number;
  templates: StencilTemplate[];
  templatedLines: number;
  rawLines: number;
  notes: string;
}

const H_HEAD = '[⌘STENCIL]';
const H_DATA = '[⌘DATA]';
const H_END = '[⌘END]';
const SLOT_RE = /\{\d+\}/;
const MAX_LINES = 4000;
const MAX_BUCKET = 500;
const MAX_TEMPLATES = 48;
const AGREE_MIN = 0.45;

function lineWords(s: string): string[] {
  return s.match(/\s*\S+|\s+/g) ?? [];
}

const esc = (s: string): string => s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
function unesc(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) { out += s[i + 1]; i++; }
    else out += s[i];
  }
  return out;
}
function splitEsc(s: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) { cur += s[i + 1]; i++; }
    else if (c === '|') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function renderTemplate(parts: string[]): string {
  let out = parts[0] ?? '';
  for (let i = 1; i < parts.length; i++) out += `{${i}}` + parts[i];
  return out;
}
function parseTemplate(tmpl: string): string[] {
  return tmpl.split(/\{\d+\}/);
}

export function stencilEncode(text: string, enc: EncodingName = 'o200k_base'): StencilResult {
  const inTokens = countTokens(text, enc);
  const inChars = text.length;
  const identity = (notes: string): StencilResult => ({
    wire: text, decoded: text, exact: true, applied: false, encoding: enc,
    inTokens, outTokens: inTokens, savedTokens: 0, savingsPct: 0,
    inChars, outChars: inChars, templates: [], templatedLines: 0, rawLines: 0, notes,
  });
  if (text.length > 120000) return identity('STENCIL: skipped over 120k chars for UI latency safety.');
  if (!text || inTokens < 12) return identity('STENCIL: input too short.');
  if (text.includes(H_HEAD) || text.includes(H_DATA) || text.includes(H_END)) {
    return identity('STENCIL: reserved marker present in input — identity fallback.');
  }
  if (SLOT_RE.test(text)) {
    return identity('STENCIL: input already contains {n} slot syntax — identity fallback.');
  }
  const lines = text.split('\n');
  if (lines.length < 3) return identity('STENCIL: fewer than 3 lines — nothing to templatise.');
  if (lines.length > MAX_LINES) return identity(`STENCIL: over ${MAX_LINES} lines — skipped for latency.`);

  const words = lines.map(lineWords);
  const buckets = new Map<number, number[]>();
  for (let i = 0; i < lines.length; i++) {
    const n = words[i].length;
    if (n < 3) continue;
    if (!lines[i].trim()) continue;
    const b = buckets.get(n);
    if (b) b.push(i); else buckets.set(n, [i]);
  }

  const templates: StencilTemplate[] = [];
  const assign = new Map<number, { tid: number; slots: string[] }>();

  for (const [count, idxs] of buckets) {
    if (idxs.length < 2) continue;
    const pool = idxs.slice(0, MAX_BUCKET);
    while (pool.length >= 2 && templates.length < MAX_TEMPLATES) {
      const seed = pool.shift()!;
      const seedW = words[seed];
      const cluster: number[] = [seed];
      for (let k = pool.length - 1; k >= 0; k--) {
        const cand = pool[k];
        let agree = 0;
        for (let p = 0; p < count; p++) if (words[cand][p] === seedW[p]) agree++;
        if (agree / count >= AGREE_MIN && agree >= 1) { cluster.push(cand); pool.splice(k, 1); }
      }
      if (cluster.length < 2) continue;

      const isSlot: boolean[] = [];
      for (let p = 0; p < count; p++) {
        let same = true;
        for (const idx of cluster) if (words[idx][p] !== seedW[p]) { same = false; break; }
        isSlot.push(!same);
      }
      const slotCount = isSlot.filter(Boolean).length;
      if (slotCount === 0 || slotCount === count) continue;

      const parts: string[] = [];
      let cur = '';
      for (let p = 0; p < count; p++) {
        if (isSlot[p]) { parts.push(cur); cur = ''; }
        else cur += seedW[p];
      }
      parts.push(cur);

      const tid = templates.length + 1;
      const tmplStr = renderTemplate(parts);
      const headerCost = countTokens(`T${tid}=${tmplStr}\n`, enc);
      let origCost = 0, dataCost = 0;
      const rows: Array<{ idx: number; slots: string[] }> = [];
      for (const idx of cluster) {
        const slots: string[] = [];
        for (let p = 0; p < count; p++) if (isSlot[p]) slots.push(words[idx][p]);
        rows.push({ idx, slots });
        origCost += countTokens(lines[idx] + '\n', enc);
        dataCost += countTokens(`T${tid}|${slots.map(esc).join('|')}\n`, enc);
      }
      const saved = origCost - (headerCost + dataCost);
      if (saved <= 0) continue;
      templates.push({ id: `T${tid}`, parts, slotCount, uses: rows.length, tokensSaved: saved });
      for (const r of rows) assign.set(r.idx, { tid, slots: r.slots });
    }
  }

  if (templates.length === 0) return identity('STENCIL: no template family cleared the real-token admission gate.');

  const headLines = templates.map((t) => `${t.id}=${renderTemplate(t.parts)}`);
  const dataLines = lines.map((ln, i) => {
    const a = assign.get(i);
    return a ? `T${a.tid}|${a.slots.map(esc).join('|')}` : `~${esc(ln)}`;
  });
  const wire = [H_HEAD, ...headLines, H_DATA, ...dataLines, H_END].join('\n');
  const decoded = stencilDecode(wire);
  if (decoded !== text) return identity('STENCIL: round trip not byte-exact — identity fallback.');
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) {
    return identity(`STENCIL: wire (${outTokens} tok) did not beat input (${inTokens} tok) — identity fallback.`);
  }
  const savedTokens = inTokens - outTokens;
  const templated = assign.size;
  return {
    wire, decoded, exact: true, applied: true, encoding: enc,
    inTokens, outTokens, savedTokens, savingsPct: (savedTokens / inTokens) * 100,
    inChars, outChars: wire.length,
    templates, templatedLines: templated, rawLines: lines.length - templated,
    notes: `STENCIL: ${templates.length} template(s) covering ${templated}/${lines.length} lines. Real BPE ${inTokens}→${outTokens} (−${((savedTokens / inTokens) * 100).toFixed(1)}%).`,
  };
}

export function stencilDecode(wire: string): string {
  if (!wire.startsWith(H_HEAD)) return wire;
  const dataAt = wire.indexOf('\n' + H_DATA + '\n');
  const endAt = wire.lastIndexOf('\n' + H_END);
  if (dataAt < 0 || endAt < 0 || endAt < dataAt) return wire;
  const headBlock = wire.slice(H_HEAD.length + 1, dataAt);
  const dataBlock = wire.slice(dataAt + H_DATA.length + 2, endAt);
  const tmpl = new Map<string, string[]>();
  if (headBlock.length) {
    for (const hl of headBlock.split('\n')) {
      const eq = hl.indexOf('=');
      if (eq <= 0) continue;
      tmpl.set(hl.slice(0, eq), parseTemplate(hl.slice(eq + 1)));
    }
  }
  const out: string[] = [];
  for (const dl of dataBlock.split('\n')) {
    if (dl.startsWith('~')) { out.push(unesc(dl.slice(1))); continue; }
    const bar = dl.indexOf('|');
    const id = bar < 0 ? dl : dl.slice(0, bar);
    const parts = tmpl.get(id);
    if (!parts) { out.push(dl); continue; }
    const slots = bar < 0 ? [] : splitEsc(dl.slice(bar + 1));
    let s = parts[0] ?? '';
    for (let i = 1; i < parts.length; i++) s += (slots[i - 1] ?? '') + parts[i];
    out.push(s);
  }
  return out.join('\n');
}

export function stencilDecoderPrompt(r: StencilResult): string {
  return [
    '# ⌘ STENCIL — template table (read directly, no decoding needed)',
    'Format:',
    '  [⌘STENCIL] section: Tn=<text with {1} {2} placeholders>',
    '  [⌘DATA]    section: Tn|v1|v2  or  ~literal line',
    'Read `T1|04:15` as the T1 sentence with 04:15 filled in.',
    'Do not write out the expansion — just reason over it directly.',
    r.applied
      ? `Active: ${r.templates.length} template(s), ${r.templatedLines} templated line(s), ${r.rawLines} literal line(s).`
      : 'Not applied for this input (identity passthrough).',
  ].join('\n');
}

export interface StencilSelfTest { name: string; pass: boolean; detail: string }
export function stencilSelfTests(enc: EncodingName = 'o200k_base'): StencilSelfTest[] {
  const out: StencilSelfTest[] = [];
  const check = (name: string, text: string) => {
    try {
      const r = stencilEncode(text, enc);
      const back = stencilDecode(r.wire);
      out.push({
        name,
        pass: back === text && r.outTokens <= r.inTokens,
        detail: back === text ? `exact · ${r.inTokens}→${r.outTokens} tok · templates=${r.templates.length} · applied=${r.applied}` : 'BYTE MISMATCH',
      });
    } catch (e) { out.push({ name, pass: false, detail: String(e) }); }
  };
  check('log family','The pump failed at 04:15 UTC.\nThe pump failed at 05:30 UTC.\nThe pump failed at 06:45 UTC.\nThe pump failed at 07:20 UTC.');
  check('csv rows','id,qty,px\n7,1200,43.75\n8,940,44.10\n9,880,45.20\n10,700,46.00');
  check('unicode + punctuation exactness','Le café coûte 3.50 euros aujourd’hui\nLe café coûte 4.00 euros aujourd’hui\nLe café coûte 4.25 euros aujourd’hui');
  return out;
}
