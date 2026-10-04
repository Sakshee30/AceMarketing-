"""Stop only the ML process group started by this workspace's live launcher."""
import os
import signal
from pathlib import Path
root = Path(__file__).resolve().parents[2]
try:
    pid = int((root / '.tmp-tools/live/ml.pid').read_text())
    args = Path(f'/proc/{pid}/cmdline').read_bytes().split(b'\0')
    target = str(root / 'scripts/live/ml-server.py').encode()
    if target in args:
        if os.getpgid(pid) == pid:
            os.killpg(pid, signal.SIGTERM)
        else:
            os.kill(pid, signal.SIGTERM)
except (FileNotFoundError, ProcessLookupError, ValueError):
    pass
