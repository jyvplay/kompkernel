import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const scripts: Record<string,string> = {
  cyr: 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
  cyrX:'ӀӁӂӃӄӅӆӇӈӉӊӋӌӍӎӏӐӑӒӓӔӕӖӗӘәӚӛӜӝӞӟӠӡӢӣӤӥӦӧӨөӪӫӬӭӮӯ',
  gre: 'αβγδεζηθικλμνξοπρστυφχψω',
  greX:'ἀἁἂἃἄἅἆἇἈἉἊἋἌἍἎἏἐἑἒἓἔἕ἖἗ἘἙἚἛἜἝ἞἟',
  dev: 'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह',
  arm: 'աբգդեզէըթժիլխծկհձղճմյնշոչպջռսվտրցւփքօֆ',
  geo: 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ',
  heb: 'אבגדהוזחטיכלמנסעפצקרשת',
  tha: 'กขคงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ',
  lao: 'ກຂຄງຈສຊຍດຕຖທນບປຜຝພຟມຢຣລວຫອຮ',
  taml:'அஆஇஈஉஊஎஏஐஒஓஔகஙசஜஞடணதநனபமயரலவழளறன',
  telu:'అఆఇఈఉఊఎఏఐఒఓఔకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరలవశషసహ',
  knda:'ಅಆಇಈಉಊಎಏಐಒಓಔಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹ',
  mlym:'അആഇഈഉഊഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരലവശഷസഹ',
  hira:'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
  kata:'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
  hang:'가각간갈감갑강개객거건걸검겁게겨결경계고곡곤골공과괄광괘괴구국군굴궁',
};
console.log('script | n1tok | avg T(rand 2-gram) | 3-gram | 4-gram | 6-gram  (lower = better runs)');
const rows: Array<[string,number,number,number,number,number]> = [];
for (const [n, s] of Object.entries(scripts)) {
  const pool = [...s].filter(c=>T(c)===1);
  if (pool.length < 20) { console.log(' ', n.padEnd(5), 'pool too small', pool.length); continue; }
  const N = 900;
  let a2=0,a3=0,a4=0,a6=0;
  for (let i=0;i<N;i++){
    const g=(k:number)=>Array.from({length:k},()=>pool[(Math.random()*pool.length)|0]).join('');
    a2+=T(g(2)); a3+=T(g(3)); a4+=T(g(4)); a6+=T(g(6));
  }
  const r: [string,number,number,number,number,number] = [n, pool.length, a2/N, a3/N, a4/N, a6/N];
  rows.push(r);
}
rows.sort((x,y)=>x[3]-y[3]);
for (const [n,p,a2,a3,a4,a6] of rows)
  console.log('  ', n.padEnd(5), String(p).padStart(3), '  ', a2.toFixed(3), '  ', a3.toFixed(3), '  ', a4.toFixed(3), '  ', a6.toFixed(3));
