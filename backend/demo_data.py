"""Create a separate, read-only fictional journey without touching real records."""
import asyncio
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import select

from growth_service import growth_snapshot, validate_growth_report
from models import Conversation, EmotionLog, GrowthInsight, Message, User

EXAMPLE_MARKER = 'maybe-example-v1'
example_lock = asyncio.Lock()


def is_example_user(user):
    return user is not None and user.avatar_seed == EXAMPLE_MARKER


async def require_editable_user(db, user_id):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail='User not found')
    if is_example_user(user):
        raise HTTPException(status_code=403, detail='示例记录仅供查看，请返回自己的练习后继续。')
    return user


async def ensure_example_user(db, now=None):
    """Import once, in one transaction; repeated visits keep the same dates and IDs."""
    async with example_lock:
        existing = (await db.execute(select(User).where(User.avatar_seed == EXAMPLE_MARKER))).scalar_one_or_none()
        if existing:
            return existing
        fixture = json.loads((Path(__file__).parent / 'fixtures' / 'demo_journey.json').read_text(encoding='utf-8'))
        # Keep local evening sessions on recent dates, independent of server timezone.
        moment = now or datetime.now(timezone.utc)
        anchor = moment.astimezone(timezone(timedelta(hours=8)))
        anchor = anchor.replace(hour=19, minute=30, second=0, microsecond=0).astimezone(timezone.utc)
        user = User(nickname=fixture['profile']['nickname'], avatar_seed=EXAMPLE_MARKER,
                    created_at=anchor - timedelta(days=28))
        db.add(user)
        await db.flush()
        references = {}
        for session in fixture['sessions']:
            started = anchor - timedelta(days=session['days_ago'])
            conv = Conversation(user_id=user.id, session_type=session['type'], title=session['title'],
                                scenario=session.get('scenario', ''), summary=session['summary'],
                                score=None, cognitive_biases=session.get('biases', []),
                                created_at=started, updated_at=started + timedelta(minutes=len(session['messages']) * 2))
            db.add(conv)
            await db.flush()
            references[session['key']] = conv.id
            for index, item in enumerate(session['messages']):
                timestamp = started + timedelta(minutes=index * 2)
                bias_data = {'detected_biases': item.get('biases', [])}
                db.add(Message(conversation_id=conv.id, role=item['role'], content=item['content'],
                               emotion=item.get('emotion', ''), emotion_intensity=item.get('intensity', 0),
                               cognitive_bias_data=bias_data, created_at=timestamp))
                if item.get('emotion') and item['role'] == 'user':
                    db.add(EmotionLog(user_id=user.id, emotion=item['emotion'], intensity=item.get('intensity', 0),
                                      trigger=session['title'], cognitive_biases=item.get('biases', []), created_at=timestamp))
        await db.flush()
        _, context, signature, _ = await growth_snapshot(db, user.id)
        report = fixture['growth_insight']
        for observation in report['progress'] + report['patterns']:
            observation['evidence_ids'] = [references[key] for key in observation.pop('evidence_keys')]
        db.add(GrowthInsight(user_id=user.id, source_hash=signature, generated_at=moment, report={
            'content': validate_growth_report(report, context),
            'based_on_sessions': len(context['conversations']),
            'source_conversations': [{key: item[key] for key in ('id', 'title', 'type', 'created_at')}
                                     for item in context['conversations']],
        }))
        await db.commit()
        return user
