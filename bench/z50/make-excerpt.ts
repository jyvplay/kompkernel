// z50: write the first N whole "node_modules/…" entries (that carry a resolved line) of a real lockfile,
// wrapped in a valid JSON skeleton. Usage: make-excerpt.ts <lockfile> <N>   (prints the excerpt to stdout)
import fs from 'node:fs';
const [f, nArg] = process.argv.slice(2);
const src = fs.readFileSync(f, 'utf8').split('\n');
const pick: string[] = [];
for (let i = 0, n = 0; i < src.length && n < Number(nArg); i++) {
  if (!/^ {4}"node_modules\/[^"]*": \{$/.test(src[i])) continue;
  let j = i + 1; while (src[j] !== '    },' && src[j] !== '    }') j++;
  const block = src.slice(i, j + 1);
  if (block.some(l => /^ {6}"resolved": /.test(l))) { pick.push(...block); n++; }
  i = j;
}
const text = '{\n  "packages": {\n' + pick.join('\n').replace(/\n    \},?$/, '\n    }').replace(/,\s*$/, '') + '\n  }\n}\n';
JSON.parse(text);
process.stdout.write(text);
