"""
Echo Backend Entry Point
FastAPI 主程序和 API 路由定义
"""

from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from pydantic import BaseModel
import uvicorn
import asyncio
import json
import os

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

def get_cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS", "*")
    if origins.strip() == "*":
        return ["*"]
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
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


@app.post("/api/chat", summary="核心交互：发送消息并获取 AI 回复")
async def chat_endpoint(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    处理用户的聊天输入。
    执行并发式多层 Prompt 分析：后台并发进行情绪与偏差识别，前台启动流式 CBT 引导生成。
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

    # 3. 保存用户消息（先保存基本内容以获取ID，分析完后再补全情绪和偏差字段）
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=request.content
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    # 4. 定义异步 SSE 生成器
    async def event_generator():
        try:
            # 立即发送 conversation_id 消息
            yield f"data: {json.dumps({'type': 'conv_id', 'conversation_id': conversation_id})}\n\n"
            await asyncio.sleep(0.01)

            # 4a. 如果是 CBT 复盘模式，启动并行后台任务做情绪和偏差合并分析
            analysis_task = None
            if request.session_type != "simulation":
                analysis_task = asyncio.create_task(
                    llm_service.analyze_emotion_and_biases_merged(request.content)
                )

            # 4b. 启动前台回复流式生成
            full_reply = ""
            if request.session_type == "simulation":
                scenario_id = getattr(request, 'scenario_id', 'stranger_event')
                custom_opts = getattr(request, 'custom_options', None)
                async for chunk in llm_service.generate_simulation_response_stream(
                    request.content, history, scenario_id, custom_opts
                ):
                    full_reply += chunk
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
            else:
                async for chunk in llm_service.generate_socratic_response_stream(
                    request.content, history, None
                ):
                    full_reply += chunk
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"

            # 5. 等待后台 CBT 分析任务完成（通常此时流式已经耗时几秒，后台任务必定早已完成）
            emotion_data = {}
            bias_data = {}
            if analysis_task:
                try:
                    analysis_result = await analysis_task
                    emotion_data = analysis_result.get("emotion_analysis", {})
                    bias_data = analysis_result.get("cognitive_biases", {})
                except Exception as ex:
                    logger.error(f"Background CBT analysis failed: {ex}", exc_info=True)

            # 6. 保存并更新 AI 回复与分析数据到数据库
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
                content=full_reply
            )
            db.add(assistant_msg)
            
            # 更新会话级认知偏差信息
            conv = (await db.execute(select(Conversation).where(Conversation.id == conversation_id))).scalar_one()
            current_biases = list(conv.cognitive_biases) if conv.cognitive_biases else []
            new_biases = [b.get("bias_type") for b in bias_data.get("detected_biases", []) if b.get("bias_type")]
            
            for nb in new_biases:
                if nb not in current_biases:
                    current_biases.append(nb)
            conv.cognitive_biases = current_biases

            await db.commit()

            # 7. 发送最终的分析结构消息
            yield f"data: {json.dumps({'type': 'analysis', 'emotion_analysis': emotion_data, 'cognitive_biases': bias_data})}\n\n"

        except Exception as e:
            logger.error(f"Error in SSE event stream: {e}", exc_info=True)
            await db.rollback()
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
