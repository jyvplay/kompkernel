// bench/x74/t3.ts
import * as fs from "node:fs";
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, "utf8");
  const lines = text.split("\n");
  const maxLen = Math.max(...lines.map((l) => l.length));
  const blank = new Int32Array(maxLen + 2);
  for (const l of lines) {
    for (let q = 0; q < l.length; q++) if (l.charCodeAt(q) === 32) blank[q]++;
    for (let q = l.length; q <= maxLen; q++) blank[q]++;
  }
  const cand = [];
  for (let q = 1; q < maxLen; q++) if (blank[q - 1] >= Math.ceil(lines.length * 0.9)) cand.push(q);
  console.log(`${p.split("/").pop()} lines ${lines.length} maxLen ${maxLen} need(.9) ${Math.ceil(lines.length * 0.9)}`);
  console.log("  candidates(field starts): " + cand.join(","));
  for (const q of cand.slice(0, 20)) console.log(`    p=${q} blank[p-1]=${blank[q - 1]} ex1=${JSON.stringify(lines[1].slice(Math.max(0, q - 4), q + 6))}`);
}
