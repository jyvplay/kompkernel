"""Targeted harness repair test; mocked jobs, NOT codec performance evidence."""
import os,json,runpy,subprocess,tempfile,contextlib,io
from pathlib import Path
from unittest.mock import patch
script=Path('bench/x185/run.py').resolve();cwd=Path.cwd()
with tempfile.TemporaryDirectory() as tmp:
 try:
  os.chdir(tmp);root=Path('bench/x185/receipts');root.mkdir(parents=True)
  for i in range(12):(root/f'paid-{i:02}.json').write_text('stale')
  def mock(cmd,**kwargs):
   job=json.loads(cmd[-1]);p=Path(job['file']);assert not p.exists()
   if p.name=='paid-00.json':raise subprocess.TimeoutExpired(cmd,90)
   p.write_text(json.dumps({'mock':True}));return subprocess.CompletedProcess(cmd,0)
  with patch('subprocess.run',mock),contextlib.redirect_stdout(io.StringIO()):runpy.run_path(str(script))
  assert not (root/'paid-00.json').exists();rows=json.loads((root/'paid-processes.json').read_text());assert len(rows)==12 and rows[0]['status']=='TIMEOUT' and all(x['status']=='completed' for x in rows[1:])
 finally:os.chdir(cwd)
print(json.dumps({'checks':14,'passed':True,'mocked':True,'scope':'runner stale receipt removal and timeout status only; no codec executions'}))
