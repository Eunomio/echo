"""Exercise growth reviews in an isolated database, without model network calls."""
import asyncio
import copy
from concurrent.futures import ThreadPoolExecutor
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
from sqlalchemy import delete, text, select
from sqlalchemy.ext.asyncio import create_async_engine
from database import async_session, init_db
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

    def test_example_import_is_repeatable_and_preserves_existing_records(self):
        original = self.client.get(self.path).json()
        first = self.client.post('/api/examples/profile')
        self.assertEqual(first.status_code, 200)
        profile = first.json()
        self.assertTrue(profile['is_example'])
        self.assertNotEqual(profile['id'], self.user_id)
        history = self.client.get(f"/api/users/{profile['id']}/conversations").json()
        self.assertEqual(len(history), 8)
        self.assertEqual(sum(item['type'] == 'review' for item in history), 5)
        self.assertTrue(all(item['has_summary'] and item['score'] is None for item in history))
        details = [self.client.get(f"/api/conversations/{item['id']}").json() for item in history]
        self.assertEqual(sum(len(item['messages']) for item in details), 32)
        growth = self.client.get(f"/api/users/{profile['id']}/growth").json()
        self.assertEqual(growth['total_emotions_logged'], 10)
        self.assertIn('中性情绪', [item['emotion'] for item in growth['recent_emotions']])
        self.assertFalse(growth['growth_insight']['stale'])
        self.assertEqual(growth['growth_insight']['based_on_sessions'], 8)
        ids = {item['id'] for item in history}
        for observation in growth['growth_insight']['content']['progress'] + growth['growth_insight']['content']['patterns']:
            self.assertTrue(set(observation['evidence_ids']).issubset(ids))
        self.assertEqual(profile, self.client.post('/api/examples/profile').json())
        self.assertEqual(history, self.client.get(f"/api/users/{profile['id']}/conversations").json())
        self.assertEqual(original, self.client.get(self.path).json())
        self.model.assert_not_awaited()

    def test_example_cannot_be_edited_or_deleted_even_through_other_user(self):
        user_id = self.client.post('/api/examples/profile').json()['id']
        history = self.client.get(f'/api/users/{user_id}/conversations').json()
        conv_id = history[0]['id']
        for owner, conversation_id, status in ((user_id, None, 403), (user_id, conv_id, 403), (self.user_id, conv_id, 404)):
            result = self.client.post('/api/chat', json={'user_id': owner, 'conversation_id': conversation_id, 'content': 'Do not add this message.'})
            self.assertEqual(result.status_code, status)
        self.assertEqual(self.client.post(f'/api/conversations/{conv_id}/delete').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/conversations/{conv_id}').status_code, 403)
        self.assertEqual(history, self.client.get(f'/api/users/{user_id}/conversations').json())

    def test_example_parallel_visits_create_one_profile(self):
        with ThreadPoolExecutor(max_workers=4) as workers:
            profiles = list(workers.map(lambda _: self.client.post('/api/examples/profile').json(), range(4)))
        self.assertEqual(len({profile['id'] for profile in profiles}), 1)
        growth = self.client.get(f"/api/users/{profiles[0]['id']}/growth").json()
        self.assertEqual(growth['total_sessions'], 8)
        self.assertEqual(growth['total_emotions_logged'], 10)

    def test_example_reports_are_ready_without_network_calls(self):
        user_id = self.client.post('/api/examples/profile').json()['id']
        growth = self.client.get(f'/api/users/{user_id}/growth').json()
        result = self.client.post(f'/api/users/{user_id}/growth/insight', json={'refresh': True})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['insight'], growth['growth_insight'])
        conv_id = growth['growth_insight']['source_conversations'][0]['id']
        with patch.object(llm_service, 'generate_conversation_report', AsyncMock()) as report_model:
            report = self.client.post(f'/api/conversations/{conv_id}/end')
            self.assertTrue(report.json()['summary'])
            report_model.assert_not_awaited()
        self.model.assert_not_awaited()

    def test_example_failed_import_rolls_back_partial_records(self):
        with patch('demo_data.validate_growth_report', side_effect=ValueError('invalid fixture')):
            with self.assertRaises(ValueError):
                self.client.post('/api/examples/profile')
        # A complete retry must produce one dataset, with no duplicate sessions.
        user_id = self.client.post('/api/examples/profile').json()['id']
        growth = self.client.get(f'/api/users/{user_id}/growth').json()
        self.assertEqual(growth['total_sessions'], 8)
        self.assertEqual(growth['total_emotions_logged'], 10)
        self.assertEqual(self.client.get(self.path).json()['total_sessions'], 1)

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

    def test_review_resumes_in_same_conversation_and_refreshes_old_report(self):
        self.assertEqual(self.generate().status_code, 200)
        async def previous_report():
            async with async_session() as db:
                conv = await db.get(Conversation, self.conv_id)
                conv.summary, conv.score = '旧的单次回顾', 80
                await db.commit()
        asyncio.run(previous_report())
        calls = []
        async def reply(content, history, biases):
            calls.append((content, history))
            yield '我们可以接着刚才借笔记的经过聊。'
        analysis = AsyncMock(return_value={'emotion_analysis': {'emotion': '平静', 'intensity': 0.3}})
        with patch.object(llm_service, 'generate_socratic_response_stream', reply), \
             patch.object(llm_service, 'analyze_emotion_and_biases_merged', analysis):
            response = self.client.post('/api/chat', json={
                'user_id': self.user_id, 'conversation_id': self.conv_id,
                'session_type': 'simulation', 'content': '后来我真的开口了，想接着说说。',
            })
        self.assertIn('"type": "analysis"', response.text)
        self.assertEqual(calls[0][1][0]['content'], '我试着向同学借笔记。')
        detail = self.client.get(f'/api/conversations/{self.conv_id}').json()
        self.assertEqual(detail['type'], 'review')
        self.assertEqual(len(detail['messages']), 4)
        self.assertEqual(detail['summary'], '')
        self.assertIsNone(detail['score'])
        self.assertFalse(detail['read_only'])
        growth = self.client.get(self.path).json()
        self.assertEqual(growth['total_sessions'], 1)
        self.assertTrue(growth['growth_insight']['stale'])

    def test_simulation_restores_saved_role_options_and_opening(self):
        calls = []
        async def reply(content, history, scenario_id, options):
            calls.append({'content': content, 'history': history, 'scenario': scenario_id, 'options': options})
            yield '你接着说，具体是哪一步没理解？'
        analysis = AsyncMock()
        with patch.object(llm_service, 'generate_simulation_response_stream', reply), \
             patch.object(llm_service, 'analyze_emotion_and_biases_merged', analysis):
            first = self.client.post('/api/chat', json={
                'user_id': self.user_id, 'session_type': 'simulation', 'scenario_id': 'professor_office',
                'custom_options': {'mood': '正在忙碌有点急躁'}, 'content': '老师，我想问第三步。',
            })
            events = [json.loads(line[6:]) for line in first.text.splitlines() if line.startswith('data: ')]
            conv_id = events[0]['conversation_id']
            detail = self.client.get(f'/api/conversations/{conv_id}').json()
            self.assertEqual(detail['scenario_id'], 'professor_office')
            self.assertEqual(detail['custom_options'], {'mood': '正在忙碌有点急躁'})
            self.assertEqual(detail['messages'][0]['role'], 'assistant')
            self.assertEqual(detail['messages'][0]['content'], '进来吧，有什么问题？')
            resumed = self.client.post('/api/chat', json={
                'user_id': self.user_id, 'conversation_id': conv_id, 'session_type': 'review',
                'scenario_id': 'roommate', 'custom_options': {'personality': '活泼外向'}, 'content': '两个条件为什么不能同时改变？',
            })
        self.assertIn('"type": "analysis"', resumed.text)
        self.assertEqual(calls[-1]['scenario'], 'professor_office')
        self.assertEqual(calls[-1]['options'], {'mood': '正在忙碌有点急躁'})
        self.assertEqual(len(calls[-1]['history']), 3)
        self.assertIn('第三步', calls[-1]['history'][1]['content'])
        self.assertEqual(len(self.client.get(f'/api/conversations/{conv_id}').json()['messages']), 5)
        analysis.assert_not_awaited()

    def test_legacy_simulation_keeps_history_without_changing_to_stranger_role(self):
        async def legacy():
            async with async_session() as db:
                conv = await db.get(Conversation, self.conv_id)
                conv.session_type, conv.simulation_config = 'simulation', None
                await db.commit()
        asyncio.run(legacy())
        calls = []
        async def reply(content, history, scenario_id, options):
            calls.append((history, scenario_id, options))
            yield '好，你继续。'
        with patch.object(llm_service, 'generate_simulation_response_stream', reply):
            result = self.client.post('/api/chat', json={'user_id': self.user_id, 'conversation_id': self.conv_id, 'content': '继续刚才的话题。'})
        self.assertIn('"type": "analysis"', result.text)
        self.assertEqual(len(calls[0][0]), 2)
        self.assertIsNone(calls[0][1])
        from prompt_templates import get_simulation_prompt
        self.assertIn('沿用历史对话', get_simulation_prompt(None))

    def test_continued_older_conversation_is_in_recent_growth_samples(self):
        for _ in range(10):
            asyncio.run(add_exchange(self.user_id))
        async def touch_original():
            from datetime import datetime, timezone
            async with async_session() as db:
                conv = await db.get(Conversation, self.conv_id)
                conv.updated_at = datetime.now(timezone.utc)
                await db.commit()
        asyncio.run(touch_original())
        async def answer(context):
            report = copy.deepcopy(self.report)
            self.assertIn(self.conv_id, [item['id'] for item in context['conversations']])
            return report
        self.model.side_effect = answer
        self.assertEqual(self.generate().status_code, 200)
        history = self.client.get(f'/api/users/{self.user_id}/conversations').json()
        self.assertEqual(history[0]['id'], self.conv_id)

    def test_existing_database_gets_simulation_settings_column_without_losing_rows(self):
        async def migrate():
            with tempfile.TemporaryDirectory(prefix='maybe-legacy-schema-') as folder:
                legacy_engine = create_async_engine('sqlite+aiosqlite:///' + (Path(folder) / 'legacy.db').as_posix())
                try:
                    async with legacy_engine.begin() as conn:
                        await conn.execute(text('CREATE TABLE conversations (id INTEGER PRIMARY KEY, user_id INTEGER, session_type VARCHAR(30), title VARCHAR(100), scenario TEXT, cognitive_biases JSON, summary TEXT, score INTEGER, created_at DATETIME, updated_at DATETIME)'))
                        await conn.execute(text("INSERT INTO conversations (id, user_id, session_type, title, summary) VALUES (1, 1, 'simulation', '保留的旧对话', '保留的回顾')"))
                    await init_db(legacy_engine)
                    await init_db(legacy_engine)
                    async with legacy_engine.connect() as conn:
                        rows = (await conn.execute(select(Conversation))).mappings().all()
                        self.assertEqual(len(rows), 1)
                        self.assertEqual(rows[0]['title'], '保留的旧对话')
                        self.assertEqual(rows[0]['summary'], '保留的回顾')
                        self.assertIsNone(rows[0]['simulation_config'])
                finally:
                    await legacy_engine.dispose()
        asyncio.run(migrate())


if __name__ == '__main__':
    unittest.main()
