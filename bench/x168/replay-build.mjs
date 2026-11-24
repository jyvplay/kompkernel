import {build} from 'esbuild';
for(const [name,entry] of [['frontier','bench/x164/frontier.ts'],['leaders','bench/x134/leaders.ts'],...['test','trial','gate','portfolio','frontier-gate','heldout','exhaustive','requests-gate'].map(n=>[n,`bench/x168/${n}.ts`])])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x168/${name}.mjs`});
