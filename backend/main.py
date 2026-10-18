"""
未必 MAYBE Backend Entry Point
FastAPI 主程序和 API 路由定义
"""

from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from pydantic import BaseModel
import uvicorn
import asyncio
import json
import os

from database import init_db, get_db, async_session
from models import User, Conversation, Message, EmotionLog, GrowthInsight
from llm_service import llm_service
from growth_service import growth_snapshot, saved_insight, validate_growth_report
from demo_data import ensure_example_user, is_example_user, require_editable_user
import prompt_templates as prompts

import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# FastAPI 应用初始化
# ============================================================

app = FastAPI(
    title="未必 MAYBE API",
    description="未必 MAYBE 的情景复盘、社交模拟与练习记录接口",
    version="1.0.0"
)

def get_cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,https://project-1q9e6.vercel.app")
    if origins.strip() == "*":
        return ["*"]
    return [origin.strip().rstrip("/") for origin in origins.split(",") if origin.strip()]


# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_origin_regex=r"https://.*\.vercel\.app",
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


class GrowthInsightRequest(BaseModel):
    refresh: bool = False


growth_insight_locks = defaultdict(asyncio.Lock)

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


@app.post("/api/examples/profile", summary="查看独立的虚构使用示例")
async def get_example_profile(db: AsyncSession = Depends(get_db)):
    user = await ensure_example_user(db)
    return {"id": user.id, "nickname": user.nickname, "is_example": True}


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
    query = select(Conversation).where(Conversation.user_id == user_id).order_by(Conversation.updated_at.desc(), Conversation.id.desc())
    result = await db.execute(query)
    conversations = result.scalars().all()
    
    return [
        {
            "id": c.id, 
            "title": c.title, 
            "type": c.session_type, 
            "score": c.score,
            "has_summary": bool(c.summary and c.summary.strip()),
            "created_at": c.created_at,
            "updated_at": c.updated_at,
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
    query_msg = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc(), Message.id.asc())
    result_msg = await db.execute(query_msg)
    messages = result_msg.scalars().all()
    
    return {
        "id": conv.id,
        "title": conv.title,
        "type": conv.session_type,
        "summary": conv.summary,
        "score": conv.score,
        "scenario_id": (conv.simulation_config or {}).get('scenario_id'),
        "custom_options": (conv.simulation_config or {}).get('custom_options', {}),
        "scenario_title": (conv.simulation_config or {}).get('title', ''),
        "read_only": is_example_user(await db.get(User, conv.user_id)),
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "emotion_analysis": {"emotion": m.emotion, "intensity": m.emotion_intensity} if m.emotion else None,
                "cognitive_biases": m.cognitive_bias_data,
                "created_at": m.created_at
            } for m in messages
        ]
    }

@app.delete("/api/conversations/{conversation_id}", summary="删除会话及历史记录")
@app.post("/api/conversations/{conversation_id}/delete", summary="删除会话及历史记录（托管平台兼容入口）")
async def delete_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    query_conv = select(Conversation).where(Conversation.id == conversation_id)
    conv = (await db.execute(query_conv)).scalar_one_or_none()
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await require_editable_user(db, conv.user_id)
    try:
        # 手动删除关联消息
        await db.execute(delete(Message).where(Message.conversation_id == conversation_id))
        await db.execute(delete(GrowthInsight).where(GrowthInsight.user_id == conv.user_id))
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

    if is_example_user(await db.get(User, conv.user_id)):
        return {"summary": conv.summary, "score": conv.score}
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

    await require_editable_user(db, conv.user_id)
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
    query_user = select(User).where(User.id == user_id)
    user = (await db.execute(query_user)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    statistics, context, signature, cached = await growth_snapshot(db, user_id)
    return {
        **statistics,
        "anxiety_level": user.anxiety_level,
        "can_generate_insight": bool(context['conversations']),
        "growth_insight": saved_insight(cached, signature) if context['conversations'] else None,
    }


@app.post("/api/users/{user_id}/growth/insight", summary="生成或更新综合成长回顾")
async def generate_growth_insight(user_id: int, request: Optional[GrowthInsightRequest] = None,
                                  db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    async with growth_insight_locks[user_id]:
        _, context, signature, cached = await growth_snapshot(db, user_id)
        if not context['conversations']:
            raise HTTPException(status_code=422, detail="先进行一次复盘或模拟对话，再生成成长回顾。")
        if is_example_user(user):
            return {"insight": saved_insight(cached, signature)}
        if cached and cached.source_hash == signature and not (request and request.refresh):
            return {"insight": saved_insight(cached, signature)}
        try:
            result = await asyncio.wait_for(llm_service.generate_growth_insight(context), timeout=90)
            content = validate_growth_report(result, context)
        except Exception as error:
            logger.error("Growth insight generation failed for user %s (%s)", user_id, type(error).__name__)
            raise HTTPException(status_code=502, detail="暂时没能生成成长回顾，请稍后重试。") from error
        record = cached or GrowthInsight(user_id=user_id)
        record.source_hash = signature
        record.generated_at = datetime.now(timezone.utc)
        record.report = {
            'content': content,
            'based_on_sessions': len(context['conversations']),
            'source_conversations': [{key: item[key] for key in ('id', 'title', 'type', 'created_at')}
                                     for item in context['conversations']],
        }
        db.add(record)
        await db.commit()
        db.expire_all()
        _, _, current_signature, saved = await growth_snapshot(db, user_id)
        return {"insight": saved_insight(saved, current_signature)}


@app.post("/api/chat", summary="核心交互：发送消息并获取 AI 回复")
async def chat_endpoint(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    处理用户的聊天输入。
    执行并发式多层 Prompt 分析：后台并发进行情绪与偏差识别，前台启动流式 CBT 引导生成。
    并持久化到数据库。
    """
    # 1. 验证用户
    await require_editable_user(db, request.user_id)
        
    # 2. 处理 Conversation 会话
    conversation_id = request.conversation_id
    history = []
    session_type = request.session_type
    scenario_id = request.scenario_id
    custom_options = request.custom_options or {}
    
    if not conversation_id:
        if session_type not in ('review', 'simulation', 'free_chat'):
            raise HTTPException(status_code=422, detail='请选择复盘或社交模拟后继续。')
        if session_type == 'simulation':
            scenario_id = scenario_id or 'stranger_event'
            if scenario_id not in prompts.SIMULATION_SCENARIOS:
                raise HTTPException(status_code=422, detail='请选择一个可用的模拟场景。')
        scenario = prompts.SIMULATION_SCENARIOS.get(scenario_id, {}) if session_type == 'simulation' else {}
        # 新建会话
        title_prefix = "场景复盘" if session_type == "review" else "社交模拟"
        new_conv = Conversation(
            user_id=request.user_id,
            session_type=session_type,
            scenario=scenario.get('description', ''),
            simulation_config={'scenario_id': scenario_id, 'custom_options': custom_options, 'title': scenario['title']}
                              if scenario else {},
            title=f"{title_prefix}: {request.content[:15]}..."
        )
        db.add(new_conv)
        await db.commit()
        await db.refresh(new_conv)
        conversation_id = new_conv.id
        conv = new_conv
        if scenario:
            opening = Message(conversation_id=conversation_id, role='assistant', content=scenario['opening'])
            db.add(opening)
            history.append({'role': 'assistant', 'content': scenario['opening']})
    else:
        conv = await db.get(Conversation, conversation_id)
        if conv is None or conv.user_id != request.user_id:
            raise HTTPException(status_code=404, detail="Conversation not found")
        # The saved conversation determines the mode and role, even when a client
        # omits settings or sends the currently selected navigation tab by mistake.
        session_type = conv.session_type
        config = conv.simulation_config or {}
        scenario_id = config.get('scenario_id')
        custom_options = config.get('custom_options', {})
        # 获取历史消息构造上下文
        query_msg = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc(), Message.id.asc())
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
    conv.summary = ''
    conv.score = None
    conv.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user_msg)

    # 4. 定义异步 SSE 生成器
    async def event_generator():
        analysis_task = None
        try:
            # 立即发送 conversation_id 消息
            yield f"data: {json.dumps({'type': 'conv_id', 'conversation_id': conversation_id})}\n\n"
            await asyncio.sleep(0.01)

            # 4a. 如果是 CBT 复盘模式，启动并行后台任务做情绪和偏差合并分析
            if session_type != "simulation":
                analysis_task = asyncio.create_task(
                    llm_service.analyze_emotion_and_biases_merged(request.content)
                )

            # 4b. 启动前台回复流式生成
            full_reply = ""
            if session_type == "simulation":
                async for chunk in llm_service.generate_simulation_response_stream(
                    request.content, history, scenario_id, custom_options
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

            # Yield dependencies may close before streaming starts. Persist using
            # a fresh session and reload the message instead of mutating a detached object.
            async with async_session() as stream_db:
                saved_message = await stream_db.get(Message, user_msg.id)
                conv = await stream_db.get(Conversation, conversation_id)
                if saved_message is None or conv is None:
                    raise ValueError("The conversation was removed before the reply finished")
                saved_message.emotion = emotion_data.get("emotion", "")
                saved_message.emotion_intensity = emotion_data.get("intensity", 0.0)
                saved_message.cognitive_bias_data = bias_data

                if emotion_data.get("emotion"):
                    stream_db.add(EmotionLog(
                        user_id=request.user_id,
                        emotion=emotion_data.get("emotion"),
                        intensity=emotion_data.get("intensity", 0.5),
                        trigger=emotion_data.get("trigger_event", ""),
                        cognitive_biases=bias_data.get("detected_biases", []),
                    ))
                stream_db.add(Message(conversation_id=conversation_id, role="assistant", content=full_reply))
                current_biases = list(conv.cognitive_biases or [])
                for bias in bias_data.get("detected_biases", []):
                    name = bias.get("bias_type")
                    if name and name not in current_biases:
                        current_biases.append(name)
                conv.cognitive_biases = current_biases
                await stream_db.commit()

            # 7. 发送最终的分析结构消息
            yield f"data: {json.dumps({'type': 'analysis', 'emotion_analysis': emotion_data, 'cognitive_biases': bias_data})}\n\n"

        except Exception as e:
            logger.error(f"Error in SSE event stream: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'content': '暂时没能收到回复，请稍后重试。'})}\n\n"
        finally:
            if analysis_task and not analysis_task.done():
                analysis_task.cancel()
                await asyncio.gather(analysis_task, return_exceptions=True)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Optional same-origin frontend for single-container application hosting.
# Register it after API routes so the static mount cannot intercept /api.
frontend_dist = os.getenv("FRONTEND_DIST")
if frontend_dist:
    app.mount("/", StaticFiles(directory=Path(frontend_dist), html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
