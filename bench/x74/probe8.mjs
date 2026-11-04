// bench/x74/probe8.ts
import * as fs from "node:fs";
var TAB = "	";
function fold(text, minLines = 8, frac = 0.9) {
  const lines = text.split("\n");
  if (lines.length < minLines) return { err: "lines<8" };
  let maxLen = 0;
  for (const l of lines) if (l.length > maxLen) maxLen = l.length;
  if (maxLen < 24) return { err: "maxLen<24" };
  const need = Math.ceil(lines.length * frac);
  const spaceCount = new Int32Array(maxLen + 1);
  for (const l of lines) for (let q = 0; q < l.length; q++) if (l.charCodeAt(q) === 32) spaceCount[q]++;
  const isBound = new Array(maxLen + 1).fill(false);
  for (let q = 1; q < maxLen; q++) {
    const present = spaceCount[q] + (lines.length - lines.filter((l) => l.length > q).length);
    if (present < need) continue;
    let left = false, right = false;
    for (const l of lines) {
      if (l.length > q - 1 && l.charCodeAt(q - 1) !== 32) left = true;
      if (l.length > q + 1 && l.charCodeAt(q + 1) !== 32) right = true;
    }
    if (left && right) isBound[q] = true;
  }
  const bounds = [0];
  for (let q = 1; q < maxLen; q++) {
    if (!isBound[q]) continue;
    if (isBound[q - 1]) continue;
    bounds.push(q);
  }
  bounds.push(maxLen);
  const spans = [];
  for (let b = 0; b + 1 < bounds.length; b++) spans.push([bounds[b], bounds[b + 1]]);
  if (spans.length < 2 || spans.length > 24) return { err: `spans ${spans.length}` };
  const widths = spans.map(([a, b]) => b - a);
  const cutsP = bounds.slice(1, -1);
  const rows = [];
  let folded = 0, literal = 0;
  for (const l of lines) {
    let ok = true;
    for (const c of cutsP) if (c < l.length && l.charCodeAt(c) !== 32) {
      ok = false;
      break;
    }
    if (ok && l.length > 0) {
      const cells = [];
      for (let c = 0; c < spans.length; c++) {
        const [a, b] = spans[c];
        const raw = c === spans.length - 1 ? l.slice(a) : l.slice(a, Math.min(b, l.length));
        if (c < spans.length - 1) {
          const t = raw.replace(/ +$/, "");
          if (t.includes(TAB)) {
            ok = false;
            break;
          }
          cells.push(t);
        } else {
          if (raw.includes(TAB)) {
            ok = false;
            break;
          }
          cells.push(raw);
        }
      }
      if (ok) {
        rows.push(cells.join(TAB));
        folded++;
        continue;
      }
    }
    rows.push("\\" + l);
    literal++;
  }
  const rebuilt = rows.map((r) => {
    if (r.startsWith("\\") && !r.includes(TAB)) return r.slice(1);
    const cells = r.split(TAB);
    let out = "";
    for (let c = 0; c < cells.length; c++) {
      out += cells[c];
      if (c < cells.length - 1) out += " ".repeat(widths[c] - cells[c].length);
    }
    return out;
  }).join("\n");
  return { widths, rows, folded, literal, exact: rebuilt === text, normalLen: rows.join("\n").length, textLen: text.length, frac: folded / lines.length };
}
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, "utf8");
  const r = fold(t);
  console.log(`${p.split("/").pop().padEnd(24)} ${r.err ?? `spans=${r.widths.length} folded=${r.folded} literal=${r.literal} frac=${(r.frac * 100).toFixed(0)}% exact=${r.exact} shrunk=${((1 - r.normalLen / r.textLen) * 100).toFixed(1)}%`}`);
}
