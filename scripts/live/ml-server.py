"""Run the existing ML application with reload and only local ML settings."""
import os
from pathlib import Path
import uvicorn

root = Path(__file__).resolve().parents[2]
for line in (root / '.env.live.local').read_text().splitlines():
    key, separator, value = line.partition('=')
    if separator and key in {'ML_SERVICE_AUTH_TOKEN', 'ML_ARTIFACT_DIR', 'CHRONOS_MODEL_ID', 'CHRONOS_LOCAL_FILES_ONLY'}:
        os.environ[key] = value.strip().strip('"').strip("'")
os.environ.setdefault('ML_ARTIFACT_DIR', '/home/aceqa/.local/share/ace-live/ml-artifacts' if os.environ.get('ACE_LIVE_WSL') == 'true' else str(root / '.tmp-tools/live/ml-artifacts'))
os.chdir(root)
if __name__ == '__main__':
    if hasattr(os, 'setsid') and os.environ.get('ACE_LIVE_WSL') == 'true':
        try:
            os.setsid()
        except PermissionError:
            pass
    (root / '.tmp-tools/live/ml.pid').write_text(str(os.getpid()))
    uvicorn.run('acemarketing_ml.app:app', app_dir=str(root / 'ml-service/src'),
                host='0.0.0.0', port=8000, reload=True,
                reload_dirs=[str(root / 'ml-service/src')])
