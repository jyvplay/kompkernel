"""Independent wire reader; parses the English header, not planner metadata."""
import pathlib,json,re,runpy,contextlib,io
root=pathlib.Path(__file__).resolve().parents[2]
with contextlib.redirect_stdout(io.StringIO()):legacy=runpy.run_path(str(root/'bench/x135/steli_audit.py'))
pattern=r'After decoding the payload, sort lines (\d+) through (\d+) by (the whole line|space-separated field (\d+)) in (ascending|descending) (integer|ASCII lexicographic) order\. Preserve all line characters and other lines; print only\.'
def parent(m):
 for pre in ['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n']:
  if m.startswith(pre+'§'):return legacy['undo'](legacy['cd'].decode(m[len(pre):]))
 raise ValueError('unsupported parent')
def undo(message,composed=False):
 header,payload=message.split('\n',1);m=re.fullmatch(pattern,header);assert m
 if composed:payload=parent(payload)
 assert len(payload)<=50000 and re.fullmatch(r'[\x20-\x7e\n]*',payload)
 lines=payload.split('\n');start,end=int(m[1])-1,int(m[2]);assert 0<=start<end<=len(lines)<=1000
 field=int(m[4])if m[4]else 0;assert 0<=field<=16
 def key(line):
  x=line if field==0 else line.strip().split()[field-1]
  if m[6]=='integer':assert re.fullmatch(r'\d{1,30}',x);return int(x)
  return x
 run=lines[start:end];assert len({key(x)for x in run})==len(run)
 lines[start:end]=sorted(run,key=key,reverse=m[5]=='descending');return '\n'.join(lines)
if __name__=='__main__':
 fixtures=json.loads((root/'bench/x142/receipts/mechanics.json').read_text());
 for x in fixtures:assert undo(x['message'])==x['expected']
 rows=[];unsupported=[]
 for name in ['probe','parent','heldout-probe','heldout-parent']:
  p=root/f'bench/x142/receipts/{name}.jsonl'
  if not p.exists():continue
  for line in p.read_text().splitlines():
   a=json.loads(line)
   if 'B'not in a:continue
   try:out=undo(a.get('message',a['contract']+a['folded']),name.endswith('parent'))
   except ValueError as e:
    if str(e)=='unsupported parent':unsupported.append({'receipt':name,'path':a['path']});continue
    raise
   assert out.encode()==(root/a['path']).read_bytes();rows.append({'receipt':name,'path':a['path']})
 print(json.dumps({'exact':len(rows),'mechanics':len(fixtures),'unsupported':unsupported,'rows':rows,'nativeVerified':False},indent=2))
