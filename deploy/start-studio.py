"""Start the full application on a Docker Studio's public port."""
import os
from pathlib import Path


def main() -> None:
    data_dir = Path(os.environ.get("APP_DATA_DIR", "/mnt/workspace/maybe"))
    data_dir.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{(data_dir / 'maybe.db').as_posix()}")
    os.execvp("uvicorn", ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"])


if __name__ == "__main__":
    main()
