import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
// sample glyphs from several scripts absent from typical English payloads
const pools: Record<string,string[]> = {
  cyr: [...'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'],
  gre: [...'αβγδεζηθικλμνξοπρστυφχψω'],
  dev: [...'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह'],
  arm: [...'աբգդեզէըթժիլխծկհձղճմյնշոչպջռսվտրցւփքօֆ'],
  geo: [...'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ'],
  heb: [...'אבגדהוזחטיכלמנסעפצקרשת'],
};
const prefix = ['','$','#','@','~','%','&','*','!','^','|','\\','?','+','=','<','>','/','.',',','-','_',':',';','"',"'",'(','[','{'];
console.log('cost of prefix+glyph (avg over glyph pool), per script. 1.00 = WRAPPER IS FREE');
for (const [sn, pool] of Object.entries(pools)) {
  const cells = prefix.map(p => {
    const cs = pool.filter(c=>T(c)===1); if(!cs.length) return '  - ';
    const bare = cs.reduce((a,c)=>a+T(c),0)/cs.length;
    const withp = cs.reduce((a,c)=>a+T(p+c),0)/cs.length;
    return (withp-bare).toFixed(2).padStart(4);
  });
  console.log(' ', sn, '|', cells.join(' '));
}
console.log('  prefix order:', JSON.stringify(prefix));
// also: does a wrapper glyph-run still merge? test 3-glyph runs with prefix on each
const pool = pools.cyr.filter(c=>T(c)===1);
for (const p of ['$','#','@','~','%']) {
  let tot=0,n=0;
  for (let i=0;i<pool.length;i+=7) for (let j=0;j<pool.length;j+=5) {
    const s = p+pool[i]+p+pool[j]+p+pool[(i+j)%pool.length]; tot+=T(s); n++;
  }
  console.log(`  3-glyph run with prefix ${JSON.stringify(p)}: avg ${(tot/n).toFixed(3)} tokens (bare baseline ~1.5-2.0)`);
}
