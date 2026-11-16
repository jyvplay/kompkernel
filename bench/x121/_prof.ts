import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const env = { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0',
  OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1', OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1',
  OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1' };
Object.assign(process.env, env);
const lane = process.argv[2]!;
const text = fs.readFileSync(lane, 'utf8');
const t = performance.now();
const r = tagstackEncode(text, 'o200k_base');
console.log(lane, 'tokens', r.messageTokens, 'ms', Math.round(performance.now() - t), 'parent', r.parentCodec);
