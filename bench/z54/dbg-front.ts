import fs from 'node:fs';
const text = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8');
const OPEN = /\{\s*$/, CLOSE = /^\s*\}/;
const scope: string[][] = [[]];
let lines = text.split('\n'); let shown = 0;
for (let i = 0; i < lines.length && shown < 14; i++) {
  const line = lines[i];
  if (OPEN.test(line)) scope.push([]);
  const m = /^(\s*"([A-Za-z_]*)url": ")(https?:\/\/[^"]*)(",?)$/.exec(line);
  if (m) { const cur = scope[scope.length - 1]; const stem = m[2].replace(/_$/, ''); console.log(i + 1, 'depth', scope.length, 'stem', stem, 'cur0', cur[0], 'eq', cur.length && cur[0] + '/' + stem === m[3]); cur.push(m[3]); shown++; }
  if (CLOSE.test(line)) scope.pop();
}
