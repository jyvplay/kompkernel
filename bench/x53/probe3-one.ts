// X53 probe3-one: ONE parent on orig|reduced gcc diagnostics. Usage: parent which lane
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);
const HDR = /^(.*):(\d+):(\d+): (error|warning|note|fatal error): (.*)$/;
const EXC = /^( *)(\d+) \| (.*)$/;
const MRK = /^( *)\| ( *)([~^]+)\s*$/;
const LBL = /^( *)\| (.*)$/;
function reduce(text: string): string | null {
  const lines = text.split('\n'); const out: string[] = []; let i = 0; let gutterW = -1;
  const back: string[] = [];
  while (i < lines.length) {
    const h = HDR.exec(lines[i]!); let done = false;
    if (h && i + 2 < lines.length) {
      const e = EXC.exec(lines[i + 1]!); const m = MRK.exec(lines[i + 2]!);
      if (e && m && Number(e[2]) === Number(h[2])) {
        const w = e[1]!.length + e[2]!.length;
        if (gutterW === -1) gutterW = w; else if (gutterW !== w) return null;
        if (m[1]!.length !== w + 1) return null;
        const marks = m[3]!; const anchor = marks.indexOf('^'); if (anchor < 0) return null;
        const start = m[2]!.length + 1;
        // verify caret column == header column
        if (start + anchor !== Number(h[3])) return null;
        const labels: string[] = []; let j = i + 3;
        while (j < lines.length && LBL.test(lines[j]!) && !EXC.test(lines[j]!)) { labels.push(lines[j]!); j++; }
        const num = String(h[2]).padStart(w, ' ');
        back.push(lines[i]!, `${num} | ${e[3]}`, `${' '.repeat(w + 1)}| ${' '.repeat(start - 1)}${'~'.repeat(anchor)}^${'~'.repeat(marks.length - anchor - 1)}`, ...labels);
        out.push(`${lines[i]} §${anchor === 0 ? marks.length : `${anchor}~${marks.length}`}`);
        out.push(e[3]!);
        for (const l of labels) out.push('¶' + LBL.exec(l)![2]!);
        i = j; done = true;
      }
    }
    if (!done) { out.push(lines[i]!); back.push(lines[i]!); i++; }
  }
  if (back.join('\n') !== text) return null;
  return out.join('\n');
}
const [parent, which, lane] = process.argv.slice(2) as [string, string, string];
const text = fs.readFileSync(lane, 'utf8');
const red = reduce(text); if (red === null) throw new Error('reduce failed');
const tx = which === 'reduced' ? red : text;
const t0 = Date.now(); let tokens: number;
if (parent === 'daedalus') { const d = daedalusEncode(tx, ENC); if (!d.exact || d.decoded !== tx) throw new Error('dae'); tokens = d.messageTokens; }
else { const a = akolouthia2Encode(tx, ENC); if (!a.exact || a.decoded !== tx) throw new Error('ako'); tokens = T(a.decoderPrompt); }
console.log(JSON.stringify({ lane, parent, which, tokens, ms: Date.now() - t0, rawTok: T(text), redRawTok: T(red) }));
