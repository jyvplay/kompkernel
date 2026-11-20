"""Message-only Python reader. No parameters or folded data read from encoder rows."""
import json,re,pathlib,importlib.util
root=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('chiron',root/'bench/chiron_decode.py')
cd=importlib.util.module_from_spec(spec);spec.loader.exec_module(cd)
def read(message):
 key,wire=message.split('\n',1)
 m=re.fullmatch(r'¶ k=v; expand recursively\. (Lines starting ~\|: remove ~\|; otherwise )?lines longer than (\d+): greedy-wrap text after the last 2\+space gap, indent continuations (\d+) spaces\. Print only\.',key)
 if not m:raise ValueError('unsupported contract')
 width,indent=int(m[2]),int(m[3]);assert 0<=indent<width<=160
 out=[]
 for line in cd.decode(wire).split('\n'):
  if m[1] and line.startswith('~|'):out.append(line[2:]);continue
  if '~' in line:raise ValueError('unexpected marker')
  if len(line)<=width:out.append(line);continue
  gaps=list(re.finditer(' {2,}',line))
  if not gaps:raise ValueError('missing delimiter')
  cut=gaps[-1].end();prefix=line[:cut];words=line[cut:].split(' ')
  if not all(words) or not line.isascii():raise ValueError('unsupported words')
  current=prefix+words[0]
  for word in words[1:]:
   if len(current)+1+len(word)>width:out.append(current);current=' '*indent+word
   else:current+=' '+word
  out.append(current)
 return '\n'.join(out)
if __name__=='__main__':
 rows=[]
 for name in ['overflow','heldout-overflow','fast','refine']:
  for line in (root/f'bench/x137/receipts/{name}.jsonl').read_text().splitlines():
   row=json.loads(line)
   if 'message' not in row:continue
   exact=read(row['message']).encode()==(root/row['path']).read_bytes()
   assert exact,(name,row['path'])
   rows.append({'receipt':name,'path':row['path'],'sourceExact':exact})
 print(json.dumps({'rows':rows,'exact':len(rows),'nativeModelVerified':False},indent=2))
