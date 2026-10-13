"""Normalize stored emotion labels without changing historical records."""
import re

EMOTION_LABELS = {
    'neutral': '中性情绪', '中性': '中性情绪',
    'calm': '平静', 'calmness': '平静',
    'anxiety': '焦虑', 'anxious': '焦虑',
    'nervous': '紧张', 'nervousness': '紧张',
    'fear': '害怕', 'fearful': '害怕', 'scared': '害怕',
    'sad': '难过', 'sadness': '难过',
    'happy': '开心', 'happiness': '开心', 'joy': '开心',
    'anger': '愤怒', 'angry': '愤怒',
    'surprise': '惊讶', 'surprised': '惊讶',
    'disgust': '厌恶', 'disgusted': '厌恶',
    'embarrassment': '尴尬', 'embarrassed': '尴尬',
    'frustration': '沮丧', 'frustrated': '沮丧',
    'confusion': '困惑', 'confused': '困惑',
    'worry': '担忧', 'worried': '担忧',
    'stress': '压力', 'stressed': '压力',
    'loneliness': '孤独', 'lonely': '孤独',
    'excited': '兴奋', 'excitement': '兴奋',
    'hope': '期待', 'hopeful': '期待',
    'relief': '释然', 'relieved': '释然',
    'unknown': '待确认', 'mixed': '复杂情绪',
}


def emotion_label(value: str | None) -> str:
    text = (value or '').strip()
    label = EMOTION_LABELS.get(text.lower())
    if label:
        return label
    if re.search(r'[\u4e00-\u9fff]', text):
        return text
    return '待确认'
