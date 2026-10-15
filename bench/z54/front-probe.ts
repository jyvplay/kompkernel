// z54 probe: REST link fields inside JSON objects (GitHub API style). Measurement + exact round trip.
// Scope = one JSON object. base = the value of that object's "url" field, once seen (only later fields may use it).
// MODE=front : a *_url value that extends an earlier URL of the same object at a '/' boundary -> "~k" + remainder
// MODE=stem  : additionally, a *_url value equal to  base + "/" + <key stem>  -> "~"   (zero-payload)
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const enc = 'o200k_base' as const;
const OPEN = /\{\s*$/, CLOSE = /^\s*\}/;
const MODE = process.env.MODE ?? 'front';
interface Scope { base?: string; list: string[] }
const URL_FWD = /^(\s*"([A-Za-z_]*)url": ")(https?:\/\/[^"]*)(",?)$/;

function fwd(text: string): { out: string; n: number; stem: number } {
  const scope: Scope[] = [{ list: [] }];
  let n = 0, stemN = 0;
  const out = text.split('\n').map(line => {
    let res = line;
    if (OPEN.test(line)) scope.push({ list: [] });
    const m = URL_FWD.exec(line);
    if (m) {
      const sc = scope[scope.length - 1];
      const v = m[3], key = m[2];
      if (key === '') { sc.base = v; sc.list.push(v); }
      else {
        const stem = key.replace(/_$/, '');
        if (MODE === 'stem' && sc.base !== undefined && sc.base + '/' + stem === v) { res = m[1] + '~' + m[4]; stemN++; }
        else {
          let best = -1, bestLen = -1;
          sc.list.forEach((b, k) => {
            if (v.startsWith(b) && b.length >= 12 && b.length > bestLen && (process.env.BOUND === 'any' || v.length === b.length || v[b.length] === '/' || v[b.length] === '?')) { best = k; bestLen = b.length; }
          });
          if (best >= 0) { res = m[1] + '~' + best + v.slice(bestLen) + m[4]; n++; }
        }
        sc.list.push(v);
      }
    }
    if (CLOSE.test(line)) scope.pop();
    return res;
  });
  return { out: out.join('\n'), n, stem: stemN };
}

function inv(wire: string): string {
  const scope: Scope[] = [{ list: [] }];
  return wire.split('\n').map(line => {
    let res = line;
    if (OPEN.test(line)) scope.push({ list: [] });
    const sc = scope[scope.length - 1];
    const s = /^(\s*"([A-Za-z_]*)url": ")~("),?$/.exec(line) ?? /^(\s*"([A-Za-z_]*)url": ")~("),?$/.exec(line);
    const sStem = /^(\s*"([A-Za-z_]*)url": ")~"(,?)$/.exec(line);
    const r = /^(\s*"([A-Za-z_]*)url": ")~(\d+)([^"]*)(",?)$/.exec(line);
    const p = URL_FWD.exec(line);
    if (sStem) {
      const key = sStem[2].replace(/_$/, '');
      const v = sc.base! + '/' + key;
      res = sStem[1] + v + '"' + sStem[3]; sc.list.push(v);
    } else if (r) {
      const v = sc.list[Number(r[3])] + r[4];
      res = r[1] + v + r[5]; sc.list.push(v);
    } else if (p) {
      if (p[2] === '') sc.base = p[3];
      sc.list.push(p[3]);
    }
    if (CLOSE.test(line)) scope.pop();
    return res;
  }).join('\n');
}

for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const { out, n, stem } = fwd(text);
  const back = inv(out);
  const a: any = daedalusEncode(text, enc);
  const b: any = daedalusEncode(out, enc);
  console.log(JSON.stringify({ lane: f.split('/').pop(), mode: MODE, fronted: n, stemFields: stem, roundTripExact: back === text, frontierM: a.messageTokens, transformedM: b.messageTokens, delta: b.messageTokens - a.messageTokens, exactTransformed: b.exact }));
}
