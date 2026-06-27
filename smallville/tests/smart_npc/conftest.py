import sys
from pathlib import Path
# Ensure both tests/smart_npc and reverie/backend_server are importable
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "reverie" / "backend_server"))