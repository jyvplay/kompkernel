// Token cost of candidate PHALANX-A7 (COL) legends. Marker is ▤ in all candidates.
import { countTokens } from '@/lib/omega/bpe';
const M = '▤';
const cands: Record<string, string> = {
  current: `# COL: each row = its first f cells (space-separated; cell i is placed at the column position in the block header "${M}T f n spec"), then, if present, a verbatim tail after one space; L<p> = left column at position p, R<p> = right column ending at p, F<p> = tail start. Marker: ${M}`,
  c1: `# COL: a line starting with ${M}T is a table block: header "${M}T f n spec"; each row = first f cells, space-separated, then an optional verbatim tail after one space; decoder pads cells to column positions (L<p> left at p, R<p> right ends at p, F<p> tail starts at p). Marker: ${M}`,
  c2: `# COL: line ${M}T f n spec = table block; each row = f cells space-separated, then optional verbatim tail after a space; cells are padded to columns (L<p> left at p, R<p> ends at p, F<p> tail starts at p). Marker: ${M}`,
  c3: `# COL: ${M}T f n spec starts a table; rows = f cells, then optional verbatim tail after one space; cells padded to columns (L<p> left at p, R<p> ends at p, F<p> tail at p). Marker: ${M}`,
  pad: `# PAD: a line starting with ${M}T is a table block: header "${M}T k n align" (k columns, n rows, align per column: L left, R right), then n rows of space-separated cells; the decoder re-pads each row to the column positions. Marker: ${M}`,
};
for (const [k, v] of Object.entries(cands)) console.log(k.padEnd(8), String(countTokens(v, 'o200k_base')).padStart(4), v.length);
