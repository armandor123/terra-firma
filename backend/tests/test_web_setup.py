import os
from pathlib import Path
import subprocess
import sys


def test_private_configuration_is_generated_without_echo_or_overwrite(tmp_path):
    script=Path(__file__).resolve().parents[2]/'scripts/configure.py'
    target=tmp_path/'private.env'
    result=subprocess.run([sys.executable,str(script),'--output',str(target)],capture_output=True,text=True)
    assert result.returncode==0
    values=dict(line.split('=',1) for line in target.read_text().splitlines() if line and not line.startswith('#'))
    assert values['DATA_MODE']=='demo' and values['VISION_MODE']=='simulated'
    assert values['DATA_API_KEY']!=values['POSTGRES_PASSWORD']
    assert len(values['DATA_API_KEY'])>=32
    assert values['DATA_API_KEY'] not in result.stdout
    if os.name=='posix':assert target.stat().st_mode & 0o777==0o600
    before=target.read_bytes()
    again=subprocess.run([sys.executable,str(script),'--output',str(target)],capture_output=True)
    assert again.returncode!=0 and target.read_bytes()==before
