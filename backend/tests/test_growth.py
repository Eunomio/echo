"""Exercise growth reviews in an isolated database, without model network calls."""
import asyncio
import copy
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

TEMP = tempfile.TemporaryDirectory(prefix='maybe-growth-tests-')
os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///' + (Path(TEMP.name) / 'checks.db').as_posix()
os.environ.pop('FRONTEND_DIST', None)

from fastapi.testclient import TestClient
from sqlalchemy import delete
from database import async_session
from main import app, growth_insight_locks, llm_service
from models import User, Conversation, Message, EmotionLog, GrowthInsight


async def seed():
    async with async_session() as db:
        for model in (GrowthInsight, Message, EmotionLog, Conversation, User):
            await db.execute(delete(model))
        primary, other, empty = User(nickname='Primary'), User(nickname='Other'), User(nickname='Empty')
        db.add_all([primary, other, empty])
        await db.flush()
        owned = Conversation(user_id=primary.id, session_type='review', title='借笔记的尝试')
        foreign = Conversation(user_id=other.id, session_type='review', title='Other private conversation')
        db.add_all([owned, foreign])
        await db.flush()
        db.add_all([
            Message(conversation_id=owned.id, role='user', content='我试着向同学借笔记。', emotion='neutral'),
            Message(conversation_id=owned.id, role='assistant', content='可以回想一下你是怎样开口的。'),
            Message(conversation_id=foreign.id, role='user', content='Do not include this private message.', emotion='anxiety'),
            Message(conversation_id=foreign.id, role='assistant', content='Other reply'),
        ])
        db.add(EmotionLog(user_id=primary.id, emotion='neutral'))
        await db.commit()
        return primary.id, other.id, empty.id, owned.id, foreign.id


async def add_exchange(user_id, conversation_id=None, emotion='中性'):
    async with async_session() as db:
        if conversation_id is None:
            conv = Conversation(user_id=user_id, session_type='review', title='新的练习')
            db.add(conv)
            await db.flush()
            conversation_id = conv.id
        db.add_all([
            Message(conversation_id=conversation_id, role='user', content='这次我先说明了想借笔记的原因。', emotion=emotion),
            Message(conversation_id=conversation_id, role='assistant', content='你尝试把需要说得更具体了。'),
        ])
        await db.commit()


class GrowthTests(unittest.TestCase):
    def setUp(self):
        growth_insight_locks.clear()
        self.client = TestClient(app)
        self.client.__enter__()
        self.user_id, self.other_id, self.empty_id, self.conv_id, self.other_conv_id = asyncio.run(seed())
        self.report = {
            'overview': '你开始尝试在需要帮助时开口表达。',
            'progress': [{'title': '尝试开口', 'description': '你在借笔记的情景中表达了需要。', 'evidence_ids': [self.conv_id]}],
            'patterns': [],
            'suggestions': [{'title': '说明需要', 'action': '下次借笔记时先简短说明缺课原因。', 'reason': '明确的请求可以帮助对方理解你的需要。'}],
            'reflection_question': '开口前后，你的感受有什么不同？',
        }
        self.model = AsyncMock(return_value=copy.deepcopy(self.report))
        self.patcher = patch.object(llm_service, 'generate_growth_insight', self.model)
        self.patcher.start()
        self.path = f'/api/users/{self.user_id}/growth'

    def tearDown(self):
        self.patcher.stop()
        self.client.__exit__(None, None, None)

    def generate(self, refresh=False):
        return self.client.post(self.path + '/insight', json={'refresh': refresh})

    def test_chinese_labels_merge_and_other_users_are_excluded(self):
        asyncio.run(add_exchange(self.user_id, self.conv_id))
        result = self.client.get(self.path).json()
        self.assertEqual(result['recent_emotions'], [{'emotion': '中性情绪', 'count': 2}])
        self.assertEqual(result['total_sessions'], 1)
        self.assertEqual(result['total_emotions_logged'], 2)

    def test_saved_report_is_reused_and_context_is_owned(self):
        first = self.generate()
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json(), self.generate().json())
        self.assertEqual(self.model.await_count, 1)
        context = self.model.await_args.args[0]
        self.assertEqual([conv['id'] for conv in context['conversations']], [self.conv_id])
        self.assertNotIn('Other private', str(context))
        stored = self.client.get(self.path).json()['growth_insight']
        self.assertEqual(stored, first.json()['insight'])
        self.assertFalse(stored['stale'])

    def test_new_messages_mark_report_stale_and_regenerate(self):
        self.assertEqual(self.generate().status_code, 200)
        asyncio.run(add_exchange(self.user_id, self.conv_id))
        self.assertTrue(self.client.get(self.path).json()['growth_insight']['stale'])
        result = self.generate()
        self.assertEqual(result.status_code, 200)
        self.assertFalse(result.json()['insight']['stale'])
        self.assertEqual(self.model.await_count, 2)

    def test_empty_and_missing_users_do_not_call_model(self):
        self.assertEqual(self.client.post(f'/api/users/{self.empty_id}/growth/insight').status_code, 422)
        self.assertEqual(self.client.post('/api/users/999999/growth/insight').status_code, 404)
        self.model.assert_not_awaited()

    def test_failed_refresh_preserves_previous_report(self):
        original = self.generate().json()['insight']
        self.model.side_effect = RuntimeError('private provider detail')
        failed = self.generate(refresh=True)
        self.assertEqual(failed.status_code, 502)
        self.assertNotIn('private provider detail', failed.text)
        self.assertEqual(self.client.get(self.path).json()['growth_insight'], original)

    def test_invalid_evidence_is_not_saved(self):
        self.model.return_value['progress'][0]['evidence_ids'] = [self.other_conv_id]
        self.assertEqual(self.generate().status_code, 502)
        self.assertIsNone(self.client.get(self.path).json()['growth_insight'])

    def test_deleted_conversation_removes_review_and_emotion_counts(self):
        self.assertEqual(self.generate().status_code, 200)
        self.assertEqual(self.client.post(f'/api/conversations/{self.conv_id}/delete').status_code, 200)
        result = self.client.get(self.path).json()
        self.assertEqual(result['total_emotions_logged'], 0)
        self.assertIsNone(result['growth_insight'])
        self.assertFalse(result['can_generate_insight'])

    def test_only_recent_ten_conversations_are_sent(self):
        for _ in range(12):
            asyncio.run(add_exchange(self.user_id))
        # Return an observation grounded in the actual sampled IDs.
        async def answer(context):
            report = copy.deepcopy(self.report)
            report['progress'][0]['evidence_ids'] = [context['conversations'][0]['id']]
            return report
        self.model.side_effect = answer
        result = self.generate()
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['insight']['based_on_sessions'], 10)
        self.assertEqual(len(self.model.await_args.args[0]['conversations']), 10)

    def test_streamed_analysis_is_saved_in_message_and_stats(self):
        analysis = {
            'emotion_analysis': {'emotion': 'neutral', 'intensity': 0.2, 'trigger_event': '一次课堂回答'},
            'cognitive_biases': {'detected_biases': [{'bias_type': 'mind_reading', 'confidence': 0.8}]},
        }
        async def reply(*args, **kwargs):
            yield '可以试着区分你观察到的事实和自己的推测。'
        with patch.object(llm_service, 'analyze_emotion_and_biases_merged', AsyncMock(return_value=analysis)), \
             patch.object(llm_service, 'generate_socratic_response_stream', reply):
            response = self.client.post('/api/chat', json={
                'user_id': self.user_id, 'conversation_id': self.conv_id,
                'session_type': 'review', 'content': '我担心课堂上的回答让同学觉得我很笨。',
            })
        self.assertEqual(response.status_code, 200)
        events = [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith('data: ')]
        self.assertEqual(events[-1]['type'], 'analysis')
        self.assertEqual(events[-1]['emotion_analysis']['emotion'], 'neutral')
        stats = self.client.get(self.path).json()
        self.assertEqual(stats['total_emotions_logged'], 2)
        self.assertEqual(stats['recent_emotions'], [{'emotion': '中性情绪', 'count': 2}])
        self.assertEqual(stats['top_biases'], [{'type': 'mind_reading', 'count': 1}])


if __name__ == '__main__':
    unittest.main()
