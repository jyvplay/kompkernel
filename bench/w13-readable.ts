import { synPlan, renderSynWire, synContract } from '../src/lib/omega/synizesis';
import fs from 'node:fs';
const src = `2026-03-04T09:15:02.118Z INFO order 10021 shipped
2026-03-04T09:17:44.907Z WARN order 10022 delayed
2026-03-05T11:02:09.330Z INFO order 10023 shipped
2026-03-05T14:48:51.006Z INFO order 10024 shipped
`;
const p = synPlan(src, 'o200k_base')!;
const w = renderSynWire(p);
fs.writeFileSync('bench/tmp/readable.src', src);
fs.writeFileSync('bench/tmp/readable.wire', w);
console.log('---- CONTRACT ----'); console.log(synContract(p));
console.log('---- WIRE ----'); console.log(w);
