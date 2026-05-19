"""
Echo 数据模型
定义用户、对话、消息、情绪日志、成长记录等核心数据结构
"""

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


# ============================================================
# SQLAlchemy ORM 模型
# ============================================================

class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nickname = Column(String(50), nullable=False, default="匿名用户")
    avatar_seed = Column(String(50), default="default")  # 用于生成随机头像
    anxiety_level = Column(Integer, default=0)  # 初始焦虑测评分数 (0-100)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # 关系
    conversations = relationship("Conversation", back_populates="user")
    emotion_logs = relationship("EmotionLog", back_populates="user")
    growth_records = relationship("GrowthRecord", back_populates="user")


class Conversation(Base):
    """对话会话表"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_type = Column(String(30), nullable=False)  # review | simulation | free_chat
    title = Column(String(100), default="新对话")
    scenario = Column(Text, default="")  # 社交情景描述
    cognitive_biases = Column(JSON, default=list)  # 识别到的认知偏差列表
    summary = Column(Text, default="")  # AI 生成的会话摘要
    score = Column(Integer, nullable=True) # 对话打分
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # 关系
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")


class Message(Base):
    """对话消息表"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user | assistant | system
    content = Column(Text, nullable=False)
    emotion = Column(String(30), default="")  # 检测到的情绪
    emotion_intensity = Column(Float, default=0.0)  # 情绪强度 0-1
    cognitive_bias_data = Column(JSON, default=dict)  # 认知偏差分析结果
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # 关系
    conversation = relationship("Conversation", back_populates="messages")


class EmotionLog(Base):
    """情绪日志表 - 记录每次交互的情绪变化"""
    __tablename__ = "emotion_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    emotion = Column(String(30), nullable=False)
    intensity = Column(Float, default=0.5)  # 0-1
    trigger = Column(Text, default="")  # 触发事件
    cognitive_biases = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # 关系
    user = relationship("User", back_populates="emotion_logs")


class GrowthRecord(Base):
    """成长记录表 - 周/月维度的成长统计"""
    __tablename__ = "growth_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    period_type = Column(String(10), nullable=False)  # weekly | monthly
    period_start = Column(DateTime, nullable=False)
    total_sessions = Column(Integer, default=0)
    avg_anxiety_level = Column(Float, default=0.0)
    top_biases = Column(JSON, default=list)  # 最常出现的认知偏差
    improvement_score = Column(Float, default=0.0)  # 进步评分
    ai_summary = Column(Text, default="")  # AI 生成的成长总结
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # 关系
    user = relationship("User", back_populates="growth_records")
