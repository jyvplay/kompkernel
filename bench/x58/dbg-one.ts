import * as fs from 'node:fs';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
const text = fs.readFileSync('bench/x58/fixtures/ewf-standings.csv', 'utf8');
try {
  const r: any = akolouthia2Encode(text, 'o200k_base');
  console.log('OK keys', Object.keys(r), 'tokens', r.messageTokens, 'exact', r.exact, 'decOk', r.decoded === text);
} catch (e: any) { console.log('THREW', e?.stack?.split('\n').slice(0, 6).join('\n')); }
