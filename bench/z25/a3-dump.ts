// Dumps PHALANX-A3 wires for the JSON files for the independent Python check.
import fs from 'node:fs';
import { phalanxA3Encode } from '@/lib/omega/phalanx-a3';
const files = ['bench/holdout/json-pkg.txt', 'bench/z25/json-real/react-latest.json', 'bench/z25/json-real/typescript-latest.json', 'bench/z25/json-real/vite-latest.json'];
const items = files.map((f) => { const t = fs.readFileSync(f, 'utf8'); return { name: f, text: t, wire: phalanxA3Encode(t).wire }; });
fs.writeFileSync('/home/user/z20-work/a3-wires.json', JSON.stringify(items));
console.log('dumped', items.length);
