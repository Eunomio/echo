"""Populate the local demonstration profile while preserving other users."""
import asyncio
import os
from pathlib import Path
import sys

backend = Path(__file__).resolve().parents[1] / 'backend'
sys.path.insert(0, str(backend))
os.chdir(backend)

from dotenv import load_dotenv
load_dotenv(backend / '.env', override=False)

from database import async_session, engine, init_db
from demo_data import ensure_example_user
from growth_service import growth_snapshot


async def main():
    await init_db()
    async with async_session() as db:
        user = await ensure_example_user(db)
        statistics, _, _, _ = await growth_snapshot(db, user.id)
        print(f"Fictional example profile ready: {statistics['total_sessions']} sessions, "
              f"{statistics['total_emotions_logged']} emotion records. Existing profiles preserved.")
        print('Open http://localhost:5173/?example=1 or choose the example button in the app.')
    await engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
