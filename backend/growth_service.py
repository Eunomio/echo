"""Collect growth evidence and validate saved reviews."""
from collections import Counter
from datetime import timezone
import hashlib
import json

from pydantic import BaseModel, Field
from sqlalchemy import select

from emotion_labels import emotion_label
from models import Conversation, Message, GrowthInsight


class GrowthObservation(BaseModel):
    title: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=500)
    evidence_ids: list[int] = Field(min_length=1, max_length=5)


class GrowthSuggestion(BaseModel):
    title: str = Field(min_length=1, max_length=60)
    action: str = Field(min_length=1, max_length=500)
    reason: str = Field(min_length=1, max_length=300)


class GrowthReport(BaseModel):
    overview: str = Field(min_length=1, max_length=800)
    progress: list[GrowthObservation] = Field(min_length=1, max_length=3)
    patterns: list[GrowthObservation] = Field(max_length=3)
    suggestions: list[GrowthSuggestion] = Field(min_length=1, max_length=3)
    reflection_question: str = Field(min_length=1, max_length=200)


def utc_text(value):
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def validate_growth_report(data, context):
    report = GrowthReport.model_validate(data)
    allowed = {item['id'] for item in context['conversations']}
    for observation in report.progress + report.patterns:
        if not set(observation.evidence_ids).issubset(allowed):
            raise ValueError('Growth evidence references unavailable records')
    return report.model_dump()


async def growth_snapshot(db, user_id):
    conversations = list((await db.execute(select(Conversation).where(
        Conversation.user_id == user_id
    ).order_by(Conversation.updated_at, Conversation.id))).scalars())
    messages = list((await db.execute(select(Message).join(Conversation).where(
        Conversation.user_id == user_id
    ).order_by(Message.created_at, Message.id))).scalars())

    emotion_messages = [message for message in messages if message.role == 'user' and message.emotion]
    emotions = Counter(emotion_label(message.emotion) for message in emotion_messages)
    biases = Counter()
    for message in emotion_messages:
        for item in (message.cognitive_bias_data or {}).get('detected_biases', []):
            if item.get('bias_type'):
                biases[item['bias_type']] += 1

    statistics = {
        'total_sessions': len(conversations),
        'total_emotions_logged': len(emotion_messages),
        'top_biases': [{'type': name, 'count': count} for name, count in biases.most_common(3)],
        'recent_emotions': [{'emotion': name, 'count': count} for name, count in emotions.most_common(5)],
    }
    grouped = {}
    for message in messages:
        if message.role in ('user', 'assistant') and message.content.strip():
            grouped.setdefault(message.conversation_id, []).append(message)
    completed = [conv for conv in conversations if any(m.role == 'user' for m in grouped.get(conv.id, []))
                 and any(m.role == 'assistant' for m in grouped.get(conv.id, []))][-10:]
    samples = []
    for conv in completed:
        history = grouped[conv.id]
        selected = history if len(history) <= 6 else history[:2] + history[-4:]
        samples.append({
            'id': conv.id, 'title': conv.title, 'type': conv.session_type,
            'created_at': utc_text(conv.created_at),
            'messages': [{'role': m.role, 'content': m.content[:600],
                          'emotion': emotion_label(m.emotion) if m.emotion else '',
                          'created_at': utc_text(m.created_at)} for m in selected],
            'summary': (conv.summary or '')[:1000],
        })
    context = {'statistics': statistics, 'conversations': samples}
    signature = hashlib.sha256(json.dumps(context, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    cached = (await db.execute(select(GrowthInsight).where(GrowthInsight.user_id == user_id))).scalar_one_or_none()
    return statistics, context, signature, cached


def saved_insight(record, signature):
    if record is None:
        return None
    return {**record.report, 'generated_at': utc_text(record.generated_at),
            'stale': record.source_hash != signature}
