"""Independent regex + stack inverse, plus stdlib Expat on real XML sources.
No TypeScript transform, encoder decoded field or saved folded field used for full wires.
"""
import re,json,xml.parsers.expat as expat
from pathlib import Path
SLASH_KEY='Decode first. In the markup, </> closes the latest unclosed tag: insert its exact name. Self-closing tags do not enter the stack. Ignore tags inside comments, CDATA and processing instructions. Preserve everything else; print only.\n'
KEY='Decode first; replace <> with the matching XML end tag. Preserve everything else; print only.\n'
TOKEN=re.compile(r'<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<(?:[^<>\"\x27]|\"[^\"<]*\"|\x27[^\x27<]*\x27)*>')
def undo(text,marker='<>'):
 assert len(text.encode('utf-16-le'))//2<=50000
 out=[];stack=[];pos=0
 for m in TOKEN.finditer(text):
  gap=text[pos:m.start()];assert '<' not in gap;out.append(gap);token=m[0];pos=m.end()
  if token==marker:
   assert stack;out.append('</'+stack.pop()+'>');continue
  out.append(token)
  if token.startswith(('<!--','<![CDATA[','<?')):continue
  c=re.fullmatch(r'</([A-Za-z_][A-Za-z0-9_.:-]*)[\t\r\n ]*>',token)
  if c:assert stack and stack.pop()==c[1];continue
  o=re.fullmatch(r'<([A-Za-z_][A-Za-z0-9_.:-]*)(?:[\t\r\n ]+[A-Za-z_][A-Za-z0-9_.:-]*[\t\r\n ]*=[\t\r\n ]*(?:"[^"<]*"|\x27[^\x27<]*\x27))*[\t\r\n ]*(/?)>',token)
  assert o
  if not o[2]:stack.append(o[1]);assert len(stack)<=128
 assert not stack and '<' not in text[pos:];out.append(text[pos:]);result=''.join(out);assert len(result.encode('utf-16-le'))//2<=50000;return result
def expat_undo(text,marker='<>'):
 # Use Expat's independent XML event stack for names; do not reuse undo's stack.
 parser=expat.ParserCreate();parser.SetParamEntityParsing(expat.XML_PARAM_ENTITY_PARSING_NEVER)
 stack=[];parser.StartElementHandler=lambda name,attrs:stack.append(name)
 parser.EndElementHandler=lambda name:stack.pop()
 out=[];pos=0
 for m in re.compile(TOKEN.pattern+'|'+re.escape(marker)).finditer(text):
  prefix=text[pos:m.start()];parser.Parse(prefix,False);out.append(prefix)
  token=m[0]
  if token==marker:
   assert stack;token='</'+stack[-1]+'>'
  parser.Parse(token,False);out.append(token);pos=m.end()
 parser.Parse(text[pos:],True);out.append(text[pos:]);assert not stack
 return ''.join(out)
checks=0
for p in json.loads(Path('bench/x164/receipts/unit-pairs.json').read_text()):assert undo(p['folded']).encode()==p['source'].encode();checks+=1
for bad in ['</>','<a></b>','<a></></>','<a>','<!DOCTYPE a><a></>','<a x="<"></>']:
 try:undo(bad)
 except AssertionError:checks+=1
 else:raise AssertionError('invalid accepted')
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'prior-independent-reader','exec'),prior)
DATE_KEY='¶k=v expand repeatedly and 8 digits become YYYY-MM-DD; print only.\n'
STACK_KEY='After parent decode, scan left to right: ignore comments, CDATA, PIs and declarations; scan > outside quoted attributes. Push each exact <name...> unless it ends />. ~ pops the top name and emits </name>. Preserve every other byte.\n'
def parent_read(m):
 for marker in ['~','+']:
  key=STACK_KEY.replace('~ pops',marker+' pops')
  if m.startswith(key):return expat_undo(prior['parent_read'](m[len(key):]),marker)
 if m.startswith(DATE_KEY+'§'):
  plain=prior['parent_read']('Before ¶ k=v. expand repeatedly; print only.\n'+m[len(DATE_KEY):])
  return re.sub(r'[0-9]+',lambda m:m[0][:4]+'-'+m[0][4:6]+'-'+m[0][6:] if len(m[0])==8 else m[0],plain)
 return prior['parent_read'](m)
rows=[]
for file in sorted(Path('bench/x164/receipts').glob('*-base.json'))+sorted(Path('bench/x164/receipts').glob('*-candidate.json')):
 r=json.loads(file.read_text());m=r['message'];decoded=undo(parent_read(m[len(KEY):])) if m.startswith(KEY) else undo(parent_read(m[len(SLASH_KEY):]),'</>') if m.startswith(SLASH_KEY) else parent_read(m)
 original=Path(r['path']).read_bytes();assert decoded.encode()==original
 if m.startswith(KEY):assert expat_undo(parent_read(m[len(KEY):])).encode()==original;checks+=1
 elif m.startswith(SLASH_KEY):assert expat_undo(parent_read(m[len(SLASH_KEY):]),'</>').encode()==original;checks+=1
 parser=expat.ParserCreate();parser.SetParamEntityParsing(expat.XML_PARAM_ENTITY_PARSING_NEVER);parser.Parse(original,True)
 rows.append({'receipt':file.name,'bytes':len(original),'tokens':r['tokens'],'sourceBytesEqual':True,'expatValid':True,'expatInverse':m.startswith((KEY,SLASH_KEY))});checks+=2
result={'checks':checks,'rows':rows,'passed':True,'native':'NOT_RUN','scope':'separate Python algorithm plus Expat source validity; program verification not native chat'}
Path('bench/x164/receipts/independent.json').write_text(json.dumps(result,indent=2));print(checks,rows)
