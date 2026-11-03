/**
 * X73 — an INDEPENDENT reader for STICHOMYTHIA messages.
 *
 * Imported by nothing: it does not call stichomythiaDecode, it does not import
 * the codec, and it was written from the printed message alone — the key line
 *
 *   spec: v+k*r = v+(k*row#) printed like v; v@+ks = v plus k sec;
 *         list* repeats; =v fixed; body = header then rows.
 *
 * and the header line that follows it. Its only job is to answer task item 8
 * mechanically: given nothing but the chat message, can the rules be recovered
 * and executed? If this file reproduces the source byte for byte, the message
 * carries its own decoder; if it needs a single fact that is not in the
 * message, that fact is a defect and this reader will fail loudly.
 *
 * It is deliberately written in the plainest way the key allows — addition,
 * padding, cycling — with no lookahead beyond the message.
 */

/** Parse a printed number, remembering decimal places and zero-pad width, so
 *  "SKU-001" and "12.50" print back the way they were printed. */
function parseNum(tok: string): { units: number; dec: number; width: number } | null {
  if (!/^-?\d+(\.\d+)?$/.test(tok)) return null;
  const dot = tok.indexOf('.');
  const dec = dot < 0 ? 0 : tok.length - dot - 1;
  const intPart = (tok.replace(/^-/, '').split('.')[0]);
  return { units: Math.round(Number(tok) * 10 ** dec), dec, width: intPart.length };
}

function printNum(units: number, dec: number, width: number): string {
  const neg = units < 0;
  const a = Math.abs(units);
  const s = dec === 0
    ? String(a).padStart(width, '0')
    : `${String(Math.floor(a / 10 ** dec)).padStart(width, '0')}.${String(a % 10 ** dec).padStart(dec, '0')}`;
  return (neg ? '-' : '') + s;
}

function clockToSec(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(v);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null;
}
function secToClock(s: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}
function stampToSec(v: string): number | null {
  const c = clockToSec(v);
  if (c !== null) return c;
  let m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z?$/.exec(v);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000;
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 1000;
  return null;
}
function printStamp(base: string, secs: number): string {
  if (clockToSec(base) !== null) return secToClock(secs);
  const d = new Date(secs * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  const day = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(base)) return day;
  const z = base.endsWith('Z') ? 'Z' : '';
  return `${day}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}${z}`;
}

/** One spec, executed for row r. Nothing here reads the codec. */
function value(spec: string, r: number): string {
  if (spec.startsWith('=')) return spec.slice(1);                       // =v fixed
  if (spec.endsWith('*')) {                                            // list* repeats
    const list = spec.slice(0, -1).split('|');
    return list[r % list.length];
  }
  const at = /^(.*?)@([+-])(\d+)s$/.exec(spec);                        // v@+ks
  if (at) {
    const base = stampToSec(at[1]);
    if (base === null) throw new Error(`reader: unprintable clock ${at[1]}`);
    return printStamp(at[1], base + (at[2] === '-' ? -1 : 1) * +at[3] * r);
  }
  const ap = /^(.*?)(-?\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)\*r([^\d]*)$/s.exec(spec); // v+k*r
  if (ap) {
    const b = parseNum(ap[2]);
    const st = parseNum(ap[4]);
    if (!b || !st) throw new Error(`reader: unprintable number in ${spec}`);
    const units = b.units + (ap[3] === '-' ? -1 : 1) * Math.round(st.units * 10 ** (b.dec - st.dec)) * r;
    return ap[1] + printNum(units, b.dec, b.width) + ap[5];
  }
  return spec.split('|')[r] ?? '';                                     // literal list
}

export function readStichomythia(message: string): string {
  const lines = message.replace(/\n$/, '').split('\n');
  if (lines.length !== 3) throw new Error('reader: expected key, header, specs');
  if (!lines[0].startsWith('spec:')) throw new Error('reader: no key');

  // S<n> sep "<sep>" r=0..<m> body:<header verbatim>
  const h = /^S(\d+) sep "([\s\S]*)" r=0\.\.(\d+) body:([\s\S]*)$/.exec(lines[1]);
  if (!h) throw new Error(`reader: cannot read header line ${JSON.stringify(lines[1])}`);
  const rows = Number(h[1]);
  const sep = h[2];
  if (Number(h[3]) !== rows - 1) throw new Error('reader: row range disagrees with row count');
  const header = h[4];

  const specs = lines[2].split(' ; ');
  const out: string[] = [];
  if (header !== '-') out.push(header);
  for (let r = 0; r < rows; r++) out.push(specs.map(s => value(s, r)).join(sep));
  return out.join('\n') + (message.endsWith('\n') ? '\n' : '');
}
