"""
Run the BitCred API.
Usage: python3 run.py
"""
import sys
import os
from pathlib import Path

backend_dir = str(Path(__file__).resolve().parent)

# Patch sys.path in THIS process
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Pass to subprocess workers via env var
os.environ["PYTHONPATH"] = backend_dir + os.pathsep + os.environ.get("PYTHONPATH", "")

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[backend_dir],
        env_file=os.path.join(backend_dir, ".env"),
    )