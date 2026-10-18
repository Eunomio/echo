"""
未必 MAYBE 数据库模块
使用 SQLAlchemy + SQLite 异步引擎
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import inspect, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./echo.db")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db(db_engine=None):
    """初始化数据库，创建所有表"""
    async with (db_engine or engine).begin() as conn:
        from models import User, Conversation, Message, EmotionLog, GrowthRecord
        await conn.run_sync(Base.metadata.create_all)
        columns = await conn.run_sync(lambda sync_conn: {column['name'] for column in inspect(sync_conn).get_columns('conversations')})
        if 'simulation_config' not in columns:
            await conn.execute(text('ALTER TABLE conversations ADD COLUMN simulation_config JSON'))


async def get_db():
    """获取数据库会话的依赖注入"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
