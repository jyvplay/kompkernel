// X53 probe3: gcc-diagnostic span-art elision prototype. Parse gcc 12 diagnostic
// blocks, verify marker/gutter derivation, measure parents on orig vs reduced.
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);
const daed = (s: string) => { const d = daedalusEncode(s, ENC); return d.exact && d.decoded === s ? d.messageTokens : null; };
const ako2 = (s: string) => { const a = akolouthia2Encode(s, ENC); return a.exact && a.decoded === s ? T(a.decoderPrompt) : null; };

const HDR = /^(.*):(\d+):(\d+): (error|warning|note|fatal error): (.*)$/;
const EXC = /^( *)(\d+) \| (.*)$/;
const MRK = /^( *)\| ( *)([~^]+)\s*$/;
const LBL = /^( *)\| (.*)$/;

interface Block { header: string; line: number; excerpt: string; start: number; len: number; anchor: number; labels: string[]; gutterW: number }

function parse(text: string): { segs: (string | Block)[]; gutterW: number } | null {
  const lines = text.split('\n'); const segs: (string | Block)[] = []; let gutterW = -1;
  let i = 0;
  while (i < lines.length) {
    const h = HDR.exec(lines[i]!);
    if (h && i + 2 < lines.length) {
      const e = EXC.exec(lines[i + 1]!); const m = MRK.exec(lines[i + 2]!);
      if (e && m && Number(e[2]) === Number(h[2])) {
        const w = e[1]!.length + e[2]!.length; // field width of line number
        if (gutterW === -1) gutterW = w; else if (gutterW !== w) return null;
        const numField = e[1]! + e[2]!;
        // marker prefix must be spaces of width numField+1 then '| '
        if (m[1]!.length !== numField.length + 1) return null;
        const marks = m[3]!; const anchor = marks.indexOf('^');
        if (anchor < 0) return null;
        const start = m[2]!.length + 1; // 1-based column in excerpt coordinates
        const labels: string[] = []; let j = i + 3;
        while (j < lines.length) {
          const l = LBL.exec(lines[j]!);
          if (!l || EXC.test(lines[j]!)) break;
          labels.push(lines[j]!); j++;
        }
        segs.push({ header: lines[i]!, line: Number(h[2]), excerpt: e[3]!, start, len: marks.length, anchor, labels, gutterW: w });
        i = j; continue;
      }
    }
    segs.push(lines[i]!); i++;
  }
  return { segs, gutterW };
}

function renderBlock(b: Block): string[] {
  const num = String(b.line).padStart(b.gutterW, ' ');
  const gut = ' '.repeat(b.gutterW + 1) + '| ';
  const marks = '~'.repeat(b.anchor) + '^' + '~'.repeat(b.len - b.anchor - 1);
  const out = [b.header, `${num} | ${b.excerpt}`, `${gut}${' '.repeat(b.start - 1)}${marks}`];
  // labels: re-render indent: original label lines kept verbatim in probe restore check below
  for (const l of b.labels) out.push(l);
  return out;
}

function reduce(text: string): { out: string; blocks: number } | null {
  const p = parse(text); if (!p) return null;
  // verify re-render byte-exact (labels verbatim for probe)
  const back: string[] = [];
  for (const s of p.segs) { if (typeof s === 'string') back.push(s); else back.push(...renderBlock(s)); }
  if (back.join('\n') !== text) return null;
  const out: string[] = []; let blocks = 0;
  for (const s of p.segs) {
    if (typeof s === 'string') { out.push(s); continue; }
    blocks++;
    out.push(`${s.header} §${s.start}+${s.len}@${s.anchor}`);
    out.push(s.excerpt);
    for (const l of s.labels) {
      const m = LBL.exec(l)!; out.push('¶' + m[2]!);
    }
  }
  return { out: out.join('\n'), blocks };
}

const CONTRACT = '◈(obelos-test) Diagnostics below are gcc-style. A header ending §S+L@A is followed by the source line it cites. Re-render each as three lines: the header without the §… suffix; the line number from the header right-aligned in a field of width W, then " | ", then the source line; then W+1 spaces, "| ", S-1 spaces, then A tildes, a caret, and tildes to total length L. Lines starting ¶ are annotation lines: print them after the marker line as W+1 spaces, "| ", then their text after ¶ (a ¶ line whose text is empty prints just the gutter and a vertical bar at the caret column: W+1 spaces, "| ", S-1+A spaces, "|"). W=5.\n';

for (const lane of process.argv.slice(2)) {
  const s = fs.readFileSync(lane, 'utf8');
  const r = reduce(s);
  console.log(`${lane} chars=${s.length} raw=${T(s)} blocks=${r ? r.blocks : 'FAIL'}`);
  if (!r) continue;
  const cTok = T(CONTRACT);
  const dO = daed(s), dR = daed(r.out), aO = ako2(s), aR = ako2(r.out);
  console.log(`  reduced raw=${T(r.out)} contract=${cTok} DAED ${dO} -> ${dR === null ? null : dR + cTok} | AKO2 ${aO} -> ${aR === null ? null : aR + cTok}`);
}
