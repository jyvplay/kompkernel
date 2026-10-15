import { countTokens } from '@/lib/omega/bpe';
const V: Record<string, string> = {
  npm_now: 'A "resolved" value ~ is https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz, where NAME is the entry key after node_modules/, BASE is NAME\'s last segment and VERSION is the entry "version".',
  npm_a: 'A "resolved" value ~ is https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz: NAME is the entry key after node_modules/, BASE its last segment, VERSION the entry version.',
  npm_b: 'Resolved ~ = https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz (entry key, its last segment, entry version).',
  npm_m: 'Resolved ~ = https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz; NAME = key after node_modules/, BASE = its last segment, VERSION = entry version.',
  npm_c: 'resolved ~ means https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz for that entry.',
  npm_d: '~ in "resolved" = https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz for that entry.',
  rest_now: 'A "_url" value ~ is the object url plus "/" plus the key name without "_url"; ~k then text is the k-th link of the object (0 = its url, then earlier links in order) plus that text.',
  rest_a: 'A "_url" value ~ is url + "/" + key stem; ~k+x is link k of this object plus x.',
  rest_b: '"*_url" ~ = object url + "/" + stem; ~k+x = link k of the object + x.',
  rest_c: '~ in a _url value = object url + "/" + key stem; ~k+x = link k + x.',
  rest_d: '_url ~ = object url+"/"+stem; ~k+x = link k of object + x.',
};
const out: Record<string, number> = {};
for (const k of Object.keys(V)) out[k] = countTokens(V[k], 'o200k_base');
console.log(JSON.stringify(out));
