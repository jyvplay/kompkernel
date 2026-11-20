import assert from 'node:assert/strict';import {tagstackEncode,tagstackMemoClear} from '../../src/lib/omega/tagstack';import {chironDecode} from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
let checks=0;const fixtures=['- 💡 instant\n- 🛠️ rich\n- 📦 build\n- 🔑 typed\n','- 💡 instant\r\n- 🛠️ rich\r\n- 📦 build\r\n','a𐀀b a𐀁c a𐀂d a𐀃e','left\0🙂\nright\0🙃\n','👨‍👩‍👧‍👦 family\n🏳️‍🌈 flag\n','last'+String.fromCodePoint(0x10ffff)];
for(const text of fixtures){const r=tagstackEncode(text);assert.equal(r.decoded,text);assert.equal(Buffer.from(r.message).toString('utf8'),r.message);checks+=2;
 if(r.message===text){assert.ok(Buffer.from(r.message).equals(Buffer.from(text)));checks++;}
 else if(r.message.startsWith('Before ¶ k=v. expand; print only.\n§')){assert.equal(chironDecode(r.message.slice(r.message.indexOf('§'))),text);checks++;}
}
delete process.env.OMEGA_NO_MEMO;tagstackMemoClear();const x=fixtures[0],a=tagstackEncode(x),b=tagstackEncode(x);assert.equal(a.message,b.message);assert.equal(Buffer.from(b.message).toString('utf8'),b.message);checks+=2;
console.log(JSON.stringify({fixtures:fixtures.length,checks,scope:'end-to-end admission and memo attacks; program decoding not native'}));
