// Audit the X60 mechanism delta against the prior in-stack string-law owner.
import * as fs from 'node:fs';
import { eirmosPlan, eirmosRestore } from '../../src/lib/omega/eirmos';
import { syllogismosPlan } from '../../src/lib/omega/syllogismos';
import { countTokens } from '../../src/lib/omega/bpe';
const text=fs.readFileSync('bench/x60/redteam/cases/username.csv','utf8');
const e=eirmosPlan(text,'o200k_base');
const s=syllogismosPlan(text,'o200k_base');
console.log(JSON.stringify({lane:'generated mixed-transform username case',sourceTokens:countTokens(text,'o200k_base'),eirmos:{applied:!!e,exact:e?eirmosRestore(e.reducedText,e.spec)===text:null,contractTokens:e?countTokens(e.contract,'o200k_base'):null,drops:e?.spec.drops.map(d=>({name:d.name,parts:d.parts,exceptions:d.exceptions.length}))??[]},syllogismos:{applied:!!s,dropKinds:s?.spec.drops.map(d=>d.kind)??[]},uniqueOperator:'lowercase-initial({first}) + lowercase({last}) inside a single per-row concatenation',limitation:'in-stack SYLLOGISMOS supports literal concatenation OR whole-field case transform, but does not compose the case transform inside a concatenation slot'},null,1));
