import {build} from 'esbuild';
for(const [name,entry] of [['frontier','bench/x164/frontier.ts'],['leaders','bench/x134/leaders.ts'],...['test','trial','gate','portfolio','frontier-gate'].map(n=>[n,`bench/x167/${n}.ts`])])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x167/${name}.mjs`});
