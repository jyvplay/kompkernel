import { countTokens } from '../src/lib/omega/bpe';
import { SYN_CONTRACT_SHAPES, SYN_CONTRACT_FREE, SYN_CONTRACT_HEX } from '../src/lib/omega/synizesis';
const T=(s:string)=>countTokens(s,'o200k_base');
console.log('current shapes', T(SYN_CONTRACT_SHAPES), 'free', T(SYN_CONTRACT_FREE), 'hex', T(SYN_CONTRACT_HEX));
const cands = [
 "Above ⇒ each line is a symbol and its pattern. Below ⇒ that symbol plus the characters after it refill its pattern's # marks in order. Print the restored text only.",
 "Each line above ⇒ is a symbol then a pattern. Below, that symbol plus following characters fill its # marks in order. Print the restored text.",
 "Above ⇒: symbol + pattern. Below: symbol + chars fill its # marks in order. Print restored text.",
 "Above ⇒ symbol=pattern. Below, chars after a symbol fill its # marks left to right. Output restored text.",
 "Legend above ⇒: symbol then pattern. In the text, a symbol's next chars fill its # marks. Print restored text.",
 "Fill each pattern's # marks with the chars following its symbol; print restored text.",
];
for (const c of cands) console.log(String(T(c)).padStart(3), JSON.stringify(c));
const frees = [
 " A pattern line with no leading symbol applies to every digit run whose length is its # count.",
 " A pattern with no symbol applies to every digit run of that many digits.",
 " Unprefixed patterns apply to every digit run of matching length.",
];
for (const c of frees) console.log('FREE', String(T(c)).padStart(3), JSON.stringify(c));
const hexes = [" After ⌁ the letters g..p are the digits 0..9."," After ≈, g-p mean 0-9."];
for (const c of hexes) console.log('HEX', String(T(c)).padStart(3), JSON.stringify(c));
