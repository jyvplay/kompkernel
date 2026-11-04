// bench/x74/t4.ts
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
  const starts = [];
  for (let q = 1; q < maxLen; q++) {
    if (blank[q] < Math.ceil(lines.length * 0.9)) continue;
    if (blank[q - 1] >= Math.ceil(lines.length * 0.9)) continue;
    starts.push(q);
  }
  console.log(`${p.split("/").pop()} maxLen ${maxLen} starts ${starts.length}: ${starts.slice(0, 20).join(",")}`);
}
