import fs from 'node:fs';
import { hyleEncode, hyleContractFor } from '@/lib/omega/hyle';
const f = process.env.F as string;
const t = fs.readFileSync(f, 'utf8');
const h = hyleEncode(t, 'o200k_base', { fast: true });
console.log(JSON.stringify({ winner: h.winner, folds: h.folds, wire: h.wire, contract: hyleContractFor(h.wire.slice(1, h.wire.indexOf('\n')).split(';')) }));
