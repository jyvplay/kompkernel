import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { diastemaEncode } from '../../src/lib/omega/diastema.before';
const text=fs.readFileSync(process.argv[2]!, 'utf8'); const s=Date.now();
const r:any=diastemaEncode(text,'o200k_base');
console.log(JSON.stringify({version:'before',ms:Date.now()-s,wireSha:createHash('sha256').update(r.wire).digest('hex'),contractSha:createHash('sha256').update(r.contract).digest('hex'),decodedExact:r.decoded===text,messageTokens:r.messageTokens,diastema:r.diastema,notes:r.notes}));
