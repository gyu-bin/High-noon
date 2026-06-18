#!/usr/bin/env python3
"""@deprecated — `bash scripts/download_bgm.sh` 로 Mixkit BGM을 받으세요."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "download_bgm.sh"


def main() -> None:
    if not SCRIPT.is_file():
        print("download_bgm.sh not found", file=sys.stderr)
        sys.exit(1)
    subprocess.run(["bash", str(SCRIPT)], check=True)


if __name__ == "__main__":
    main()
