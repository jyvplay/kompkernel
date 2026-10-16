// X20: write a HENOSIS (or SIGE) message for a lane into bench/x20/llm/<name>.msg.txt
// so the model can decode it blind (the source is copied to <name>.orig.txt and NOT read first).
import fs from 'node:fs';
import { henosisEncode } from '@/lib/omega/henosis';
import { sigeEncode } from '@/lib/omega/sige';
const enc = 'o200k_base' as const;
const useSige = process.env.SIGE_ONLY === '1';
const f = process.argv[2];
const name = process.argv[3];
const text = fs.readFileSync(f, 'utf8');
const r: any = useSige ? sigeEncode(text, enc) : henosisEncode(text, enc);
const dir = 'bench/x20/llm';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(`${dir}/${name}.msg.txt`, r.decoderPrompt);
fs.writeFileSync(`${dir}/${name}.orig.txt`, text);
console.log(JSON.stringify({ name, codec: r.codec, arm: r.arm ?? 'sige', M: r.messageTokens, exact: r.decoded === text }));
