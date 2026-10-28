// X52 probe1: corpus density of candidate entailment classes.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
const T = (s: string) => countTokens(s, 'o200k_base');
const roots = ['bench/z11', 'bench/z48', 'bench/z57', 'bench/holdout-x40', 'bench/holdout-tab', 'bench/x20', 'bench/z44', 'bench/z59'];
const files: string[] = [];
function walk(d: string) { try { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(csv|tsv|txt|md|json|sql|log)$/i.test(e.name) && fs.statSync(p).size < 400_000) files.push(p); } } catch {} }
roots.forEach(walk);
console.log('files', files.length);

const symHits: any[] = []; const totalRows: any[] = []; const citeHits: any[] = []; const unitHits: any[] = []; const mdHits: any[] = []; const crlf: any[] = [];
for (const f of files) {
  let tx: string; try { tx = fs.readFileSync(f, 'utf8'); } catch { continue; }
  if (tx.includes('\r\n') && !tx.replaceAll('\r\n', '').includes('\n') && tx.length > 500) crlf.push({ f, lines: tx.split('\r\n').length, tok: T(tx) });
  const lines = tx.split(/\r?\n/);
  // --- symmetric numeric matrix blocks (whitespace or comma separated, >=4x4) ---
  const numRow = (l: string): string[] | null => { const cells = l.trim().split(/[,\t ]+/).filter(Boolean); if (cells.length < 4) return null; return cells.every(c => /^-?\d+(?:\.\d+)?$/.test(c)) ? cells : null; };
  let block: string[][] = [];
  const flush = () => { if (block.length >= 4 && block.every(r => r.length === block.length)) { let sym = true; outer: for (let i = 0; i < block.length; i++) for (let j = i + 1; j < block.length; j++) if (block[i]![j] !== block[j]![i]) { sym = false; break outer; } if (sym) symHits.push({ f, n: block.length, tok: T(block.map(r => r.join(' ')).join('\n')) }); } block = []; };
  for (const l of lines) { const r = numRow(l); if (r) block.push(r); else flush(); } flush();
  // --- totals rows in delimited files ---
  if (/\.(csv|tsv)$/i.test(f)) { const idx = lines.findIndex(l => /^\s*"?total/i.test(l)); if (idx > 2) totalRows.push({ f, line: idx, rows: lines.length }); }
  // --- citation numbers [n] ---
  const cites = [...tx.matchAll(/\[(\d{1,3})\]/g)].map(m => Number(m[1]));
  if (cites.length >= 15) { const seen = new Set<number>(); let orderOk = true; for (const c of cites) { if (!seen.has(c)) { if (c !== seen.size + 1) { orderOk = false; break; } seen.add(c); } } citeHits.push({ f, n: cites.length, distinct: seen.size, firstAppearanceOrder: orderOk }); }
  // --- unit conversion parentheticals ---
  const units = [...tx.matchAll(/(\d+(?:\.\d+)?)\s?(km|kg|cm|mm|metres?|meters?|litres?|liters?|°C)\b[^()\n]{0,20}\((\d+(?:\.\d+)?)\s?(mi|lb|in|ft|°F|gal|mph)\)/g)];
  if (units.length >= 2) unitHits.push({ f, n: units.length, ex: units.slice(0, 3).map(u => u[0]) });
  // --- markdown pretty tables ---
  const sepIdx = lines.filter(l => /^\|[\s:|-]+\|$/.test(l.trim()) && l.includes('-')).length;
  if (sepIdx >= 1) { const tbl = lines.filter(l => l.trim().startsWith('|')); const padTok = tbl.reduce((a, l) => a + T(l.replace(/\s+/g, ' ')) - 0, 0); mdHits.push({ f, tableLines: tbl.length, tableTok: T(tbl.join('\n')), ex: tbl[0]?.slice(0, 80) }); }
}
console.log('SYMMETRIC MATRICES', JSON.stringify(symHits, null, 1));
console.log('TOTALS ROWS', JSON.stringify(totalRows));
console.log('CITATIONS', JSON.stringify(citeHits, null, 1));
console.log('UNIT PARENTHETICALS', JSON.stringify(unitHits, null, 1));
console.log('MD TABLES', JSON.stringify(mdHits, null, 1));
console.log('CRLF-UNIFORM', JSON.stringify(crlf));
