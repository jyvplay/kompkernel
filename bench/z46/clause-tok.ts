import { countTokens } from '../../src/lib/omega/bpe';
const cands = [
  '∴ In stack frames, "at C.m(:N)" stands for "at C.m(S.java:N)" where S is C\'s simple class name — the part after the last "." or "/", cut at the first "$".\n',
  '∴ In stack frames "at C.m(:N)" = "at C.m(S.java:N)", S = C after its last "." or "/", cut at the first "$".\n',
  '∴ Stack frames: "at C.m(:N)" = "at C.m(S.java:N)", S = C after its last "." or "/", cut before any "$".\n',
  '∴ In links, "[t](#)" stands for "[t](#s)" where s is t lowercased with every character other than letters, digits, spaces, "-" and "_" removed and each space turned into "-".\n',
  '∴ Links: "[t](#)" = "[t](#s)", s = t lowercased, keeping only letters, digits, spaces, "-" and "_", then spaces → "-".\n',
  '∴ Links: "[t](#)" = "[t](#s)", s = t lowercased, all but letters, digits, spaces, "-", "_" dropped, spaces → "-".\n',
];
for (const c of cands) console.log(countTokens(c, 'o200k_base'), JSON.stringify(c));
