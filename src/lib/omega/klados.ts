/** X179 KLADOS: adaptive move-to-root BST word addresses.
 * Experimental/unwired. Classical self-adjusting tree ancestry; NOT splay's
 * zig-zig algorithm and no splay amortized theorem is claimed. Not native proof.
 */
import {countTokensExact,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const KLADOS_CAP=50000;
export const KLADOS_KEY='Decode payload first. Maintain an initially empty binary search tree of case-sensitive ASCII words ([A-Za-z]+), ordered ASCII-lexicographically. Literal words are inserted if new, otherwise accessed. ^ followed by zero or more 0/1 digits and ; accesses the node reached from the root (0=left, 1=right); emit its word. After EVERY insertion or access, rotate that node with its parent repeatedly until it is root, preserving BST order (single rotations only, not zig-zig splaying). Scan only the payload, never expansions. Preserve all other characters and print only.\n';
type Node={word:string;left:Node|null;right:Node|null;parent:Node|null};
class Tree{
 root:Node|null=null;size=0;accesses=0;
 move(x:Node){while(x.parent){const p=x.parent,g=p.parent;if(p.left===x){p.left=x.right;if(x.right)x.right.parent=p;x.right=p;}else{p.right=x.left;if(x.left)x.left.parent=p;x.left=p;}p.parent=x;x.parent=g;if(!g)this.root=x;else if(g.left===p)g.left=x;else g.right=x;}}
 word(word:string){if(++this.accesses>12000)throw Error('KLADOS access cap');if(!this.root){this.size=1;this.root={word,left:null,right:null,parent:null};return {node:this.root,path:null};}let node=this.root,path='';
  while(node.word!==word){const side=word<node.word?'left':'right';path+=side==='left'?'0':'1';const next=node[side];if(next)node=next;else{if(++this.size>2048)throw Error('KLADOS dictionary cap');const fresh:Node={word,left:null,right:null,parent:node};node[side]=fresh;this.move(fresh);return {node:fresh,path:null};}}
  this.move(node);return {node,path};
 }
 path(path:string){if(++this.accesses>12000||path.length>2048)throw Error('KLADOS reference cap');let node=this.root;for(const d of path){if(!node)throw Error('KLADOS absent path');node=d==='0'?node.left:node.right;}if(!node)throw Error('KLADOS absent node');this.move(node);return node.word;}
}
function domain(s:string){if(s.length>KLADOS_CAP||!isUtf8TransportStable(s))throw Error('KLADOS domain');}
export function kladosUndo(folded:string){domain(folded);const tree=new Tree();let units=0;
 const out=folded.replace(/\^[01]*;|\^|[A-Za-z]+|[^A-Za-z^]+/g,token=>{let value=token;if(token[0]==='^'){if(!token.endsWith(';'))throw Error('KLADOS malformed reference');value=tree.path(token.slice(1,-1));}else if(/^[A-Za-z]/.test(token))tree.word(token);units+=value.length;if(units>KLADOS_CAP)throw Error('KLADOS expansion');return value;});domain(out);return out;
}
export function kladosPlan(source:string,policy:'eager'|'local',enc:EncodingName='o200k_base'){
 domain(source);if(!['eager','local'].includes(policy))throw Error('KLADOS policy');if(source.includes('^'))return null;const tree=new Tree();let sites=0;const folded=source.replace(/[A-Za-z]+/g,word=>{const {path}=tree.word(word);if(path===null)return word;const ref='^'+path+';';if(policy==='local'&&countTokensExact(ref,enc)>=countTokensExact(word,enc))return word;sites++;return ref;});if(!sites||folded.length>KLADOS_CAP)return null;
 if(kladosUndo(folded)!==source)throw Error('KLADOS inverse');const message=KLADOS_KEY+folded;return {policy,sites,folded,message,tokens:countTokensExact(message,enc)};
}
export function kladosPlans(source:string,enc:EncodingName='o200k_base'){const plans:NonNullable<ReturnType<typeof kladosPlan>>[]=[];for(const policy of ['eager','local'] as const){const p=kladosPlan(source,policy,enc);if(p&&!plans.some(q=>q.folded===p.folded))plans.push(p);}return plans.sort((a,b)=>a.tokens-b.tokens);}
export function kladosRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>KLADOS_CAP+2000||!message.startsWith(KLADOS_KEY))throw Error('KLADOS contract');return kladosUndo(parent(message.slice(KLADOS_KEY.length)));}
