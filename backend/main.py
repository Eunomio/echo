"""
Echo Backend Entry Point
FastAPI 主程序和 API 路由定义
"""

from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from pydantic import BaseModel
import uvicorn

from database import init_db, get_db
from models import User, Conversation, Message, EmotionLog
from llm_service import llm_service

import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# FastAPI 应用初始化
# ============================================================

app = FastAPI(
    title="Echo API",
    description="AI Social Anxiety Cognitive Training System Backend",
    version="1.0.0"
)

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发阶段允许所有
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized.")


# ============================================================
# Pydantic Schemas (API 请求与响应体定义)
# ============================================================

class ChatRequest(BaseModel):
    user_id: int
    conversation_id: Optional[int] = None
    session_type: str = "review"  # review | simulation
    scenario_id: Optional[str] = None  # 只在 simulation 模式下使用
    custom_options: Optional[dict] = None # 用户设定的场景选项
    content: str

class HintRequest(BaseModel):
    reason: str

class MessageResponse(BaseModel):
    role: str
    content: str
    emotion_analysis: Optional[dict] = None
    cognitive_biases: Optional[dict] = None

class ChatResponse(BaseModel):
    conversation_id: int
    reply: MessageResponse


# ============================================================
# API 路由
# ============================================================

@app.get("/api/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy", "version": "1.0.0"}


@app.post("/api/users", summary="创建或获取测试用户")
async def create_test_user(nickname: str = Body(..., embed=True), db: AsyncSession = Depends(get_db)):
    """创建一个新用户或返回已有用户，主要用于测试/比赛"""
    query = select(User).where(User.nickname == nickname)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(nickname=nickname, anxiety_level=60)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    return {"id": user.id, "nickname": user.nickname, "anxiety_level": user.anxiety_level}


@app.get("/api/users/{user_id}/conversations", summary="获取用户的对话历史列表")
async def get_user_conversations(user_id: int, db: AsyncSession = Depends(get_db)):
    query = select(Conversation).where(Conversation.user_id == user_id).order_by(Conversation.created_at.desc())
    result = await db.execute(query)
    conversations = result.scalars().all()
    
    return [
        {
            "id": c.id, 
            "title": c.title, 
            "type": c.session_type, 
            "score": c.score,
            "has_summary": bool(c.summary and c.summary.strip()),
            "created_at": c.created_at
        } for c in conversations
    ]

@app.get("/api/conversations/{conversation_id}", summary="获取单次对话的详细内容")
async def get_conversation_detail(conversation_id: int, db: AsyncSession = Depends(get_db)):
    # 验证对话是否存在
    query_conv = select(Conversation).where(Conversation.id == conversation_id)
    result_conv = await db.execute(query_conv)
    conv = result_conv.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    # 获取消息
    query_msg = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    result_msg = await db.execute(query_msg)
    messages = result_msg.scalars().all()
    
    return {
        "id": conv.id,
        "title": conv.title,
        "type": conv.session_type,
        "summary": conv.summary,
        "score": conv.score,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at
            } for m in messages
        ]
    }

@app.delete("/api/conversations/{conversation_id}", summary="删除会话及历史记录")
async def delete_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    query_conv = select(Conversation).where(Conversation.id == conversation_id)
    conv = (await db.execute(query_conv)).scalar_one_or_none()
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    try:
        # 手动删除关联消息
        await db.execute(delete(Message).where(Message.conversation_id == conversation_id))
        # 删除会话
        await db.delete(conv)
        await db.commit()
        return {"status": "success", "message": "Conversation deleted"}
    except Exception as e:
        logger.error(f"Delete conversation error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/conversations/{conversation_id}/end", summary="结束对话并生成分析报告")
async def end_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    query_conv = select(Conversation).where(Conversation.id == conversation_id)
    conv = (await db.execute(query_conv)).scalar_one_or_none()
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    query_msg = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    messages = (await db.execute(query_msg)).scalars().all()
    
    if not messages:
        return {"summary": "对话太短，暂无分析报告。", "score": None}
        
    history = [{"role": m.role, "content": m.content} for m in messages if m.role in ["user", "assistant"]]
    
    try:
        report_data = await llm_service.generate_conversation_report(history)
        conv.summary = report_data.get("report", "")
        conv.score = report_data.get("score", None)
        await db.commit()
        return {"summary": conv.summary, "score": conv.score}
    except Exception as e:
        logger.error(f"End conversation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/conversations/{conversation_id}/hint", summary="生成回复建议")
async def get_conversation_hint(conversation_id: int, request: HintRequest, db: AsyncSession = Depends(get_db)):
    query_conv = select(Conversation).where(Conversation.id == conversation_id)
    conv = (await db.execute(query_conv)).scalar_one_or_none()
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    query_msg = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    messages = (await db.execute(query_msg)).scalars().all()
    history = [{"role": m.role, "content": m.content} for m in messages if m.role in ["user", "assistant"]]
    
    try:
        hint_data = await llm_service.generate_simulation_hint(history, request.reason)
        return hint_data
    except Exception as e:
        logger.error(f"Generate hint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scenarios", summary="获取所有社交模拟场景")
async def get_scenarios():
    import prompt_templates as prompts
    return prompts.get_all_scenarios()

@app.get("/api/users/{user_id}/growth", summary="获取用户成长数据")
async def get_growth_data(user_id: int, db: AsyncSession = Depends(get_db)):
    # 简单统计用户数据返回给前端仪表盘
    query_user = select(User).where(User.id == user_id)
    user = (await db.execute(query_user)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query_conv = select(Conversation).where(Conversation.user_id == user_id)
    convs = (await db.execute(query_conv)).scalars().all()

    query_emo = select(EmotionLog).where(EmotionLog.user_id == user_id)
    emos = (await db.execute(query_emo)).scalars().all()

    # 提取最近检测到的偏差频率
    bias_counts = {}
    for emo in emos:
        for b in (emo.cognitive_biases or []):
            b_type = b.get("bias_type")
            if b_type:
                bias_counts[b_type] = bias_counts.get(b_type, 0) + 1
    
    top_biases = sorted(bias_counts.items(), key=lambda x: x[1], reverse=True)[:3]

    # 提取情绪频率
    emo_counts = {}
    for emo in emos:
        if emo.emotion:
            emo_counts[emo.emotion] = emo_counts.get(emo.emotion, 0) + 1
            
    recent_emotions_stats = [{"emotion": k, "count": v} for k, v in sorted(emo_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

    return {
        "anxiety_level": user.anxiety_level,
        "total_sessions": len(convs),
        "total_emotions_logged": len(emos),
        "top_biases": [{"type": k, "count": v} for k, v in top_biases],
        "recent_emotions": recent_emotions_stats
    }


@app.post("/api/chat", response_model=ChatResponse, summary="核心交互：发送消息并获取 AI 回复")
async def chat_endpoint(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    处理用户的聊天输入。
    执行全套的多层 Prompt 分析：情绪提取 -> 偏差识别 -> CBT引导生成。
    并持久化到数据库。
    """
    # 1. 验证用户
    query_user = select(User).where(User.id == request.user_id)
    user = (await db.execute(query_user)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. 处理 Conversation 会话
    conversation_id = request.conversation_id
    history = []
    
    if not conversation_id:
        # 新建会话
        title_prefix = "场景复盘" if request.session_type == "review" else "社交模拟"
        new_conv = Conversation(
            user_id=request.user_id,
            session_type=request.session_type,
            title=f"{title_prefix}: {request.content[:15]}..."
        )
        db.add(new_conv)
        await db.commit()
        await db.refresh(new_conv)
        conversation_id = new_conv.id
    else:
        # 获取历史消息构造上下文
        query_msg = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
        old_messages = (await db.execute(query_msg)).scalars().all()
        for msg in old_messages:
            if msg.role in ["user", "assistant"]:
                 history.append({"role": msg.role, "content": msg.content})

    # 3. 保存用户消息
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=request.content
    )
    db.add(user_msg)
    
    # 4. 调用 LLM 服务
    try:
        if request.session_type == "simulation":
            # 社交模拟模式（前端应通过特殊格式或额外的字段传 scenario_id，为了简单，我们可以假设在 content 中带有特定标记，或者通过扩展 request 做到，这里简单使用 default scenario_id 或者截取）
            # 对于MVP，我们可以在新建 simulation 会话时将 scenario_id 存入 title 或者作为一个新字段。
            # 为了最简化，如果前端发送 simulation 且是第一条消息，我们将场景ID存入 scenario 字段。
            
            # 这里简单判断：尝试从 scenario 字段或者前端特殊约定提取。为了简单，直接调用 simulation 并传 default (如果是真实情况前端会传 scenario_id)
            # 我们给 ChatRequest 加一个 scenario_id 字段比较合适，但我这里直接先写死或者动态取。
            # 兼容性处理：
            scenario_id = getattr(request, 'scenario_id', 'stranger_event')
            custom_opts = getattr(request, 'custom_options', None)
            reply_text = await llm_service.generate_simulation_response(request.content, history, scenario_id, custom_opts)
            emotion_data = {}
            bias_data = {}
        else:
            # 默认的情景复盘模式（CBT分析流水线）
            pipeline_result = await llm_service.process_full_pipeline(
                user_input=request.content,
                history=history
            )
            reply_text = pipeline_result["reply"]
            emotion_data = pipeline_result["emotion_analysis"]
            bias_data = pipeline_result["cognitive_biases"]
        
        # 5. 保存并更新 AI 回复与分析数据
        # 更新用户消息关联的情绪和偏差数据
        user_msg.emotion = emotion_data.get("emotion", "")
        user_msg.emotion_intensity = emotion_data.get("intensity", 0.0)
        user_msg.cognitive_bias_data = bias_data
        
        # 记录情绪日志
        if emotion_data.get("emotion"):
            emo_log = EmotionLog(
                user_id=request.user_id,
                emotion=emotion_data.get("emotion"),
                intensity=emotion_data.get("intensity", 0.5),
                trigger=emotion_data.get("trigger_event", ""),
                cognitive_biases=bias_data.get("detected_biases", [])
            )
            db.add(emo_log)
        
        # 保存 AI 助手回复消息
        assistant_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=reply_text
        )
        db.add(assistant_msg)
        
        # 更新会话级信息
        conv = (await db.execute(select(Conversation).where(Conversation.id == conversation_id))).scalar_one()
        current_biases = list(conv.cognitive_biases) if conv.cognitive_biases else []
        new_biases = [b.get("bias_type") for b in bias_data.get("detected_biases", []) if b.get("bias_type")]
        
        # 简单的合并去重
        for nb in new_biases:
            if nb not in current_biases:
                current_biases.append(nb)
        conv.cognitive_biases = current_biases

        await db.commit()
        
        # 6. 构建并返回响应
        return ChatResponse(
            conversation_id=conversation_id,
            reply=MessageResponse(
                role="assistant",
                content=reply_text,
                emotion_analysis=emotion_data,
                cognitive_biases=bias_data
            )
        )
        
    except Exception as e:
        logger.error(f"Chat processing error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
