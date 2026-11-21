"""External GNU expand verifies the positional inverse, not native LLM behavior."""
import json,subprocess,sys,importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('parent','bench/x157/parent-reader.py');parent=importlib.util.module_from_spec(spec);spec.loader.exec_module(parent)
def expand(s,w,phase):return subprocess.run(['expand','-t',str(w) if phase==0 else f'{phase},+{w}'],input=s.encode(),capture_output=True,check=True).stdout
checks=0
for r in json.loads(Path('bench/x158/receipts/unit-pairs.json').read_text()):assert expand(r['folded'],r['width'],r['phase'])==r['source'].encode();checks+=1
for r in json.loads(Path('bench/x158/receipts/screen.json').read_text()):assert expand(r['folded'],r['width'],r['phase'])==Path(r['path']).read_bytes();checks+=1
rows=[]
for file in sys.argv[1:]:
 r=json.loads(Path(file).read_text());body=r['message'].split('\n',1)[1];folded=parent.parent_read(body);assert expand(folded,r['width'],r.get('phase',0))==Path(r['path']).read_bytes();checks+=1;rows.append({'path':r['path'],'tokens':r['tokens'],'passed':True})
Path('bench/x158/receipts/independent.json').write_text(json.dumps({'checks':checks,'fullMessages':rows,'verifier':subprocess.check_output(['expand','--version'],text=True).splitlines()[0],'native':False},indent=2));print(checks)
