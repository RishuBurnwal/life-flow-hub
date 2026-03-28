import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent


def run(cmd: str):
    print(f"[lifeos] $ {cmd}")
    subprocess.check_call(cmd, cwd=ROOT, shell=True)


def ensure_deps():
    node_modules = ROOT / "node_modules"
    if node_modules.exists():
        return
    run("npm install")


def main():
    try:
        ensure_deps()
        run("npm run dev")
    except subprocess.CalledProcessError as exc:
        print(f"Command failed with exit code {exc.returncode}")
        sys.exit(exc.returncode)


if __name__ == "__main__":
    main()
