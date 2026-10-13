import { useState } from 'react';
import { apiService } from '../services/api';

export default function GrowthInsight({ userId, insight, canGenerate, onUpdated, onOpenConversation, onStartPractice }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const content = insight?.content;
  const sources = new Map((insight?.source_conversations || []).map(item => [item.id, item]));

  const generate = async () => {
    if (isGenerating || !userId || !canGenerate) return;
    setIsGenerating(true);
    setError('');
    try {
      const result = await apiService.getGrowthInsight(userId, Boolean(insight && !insight.stale));
      onUpdated(result.insight);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : '暂时没能生成成长回顾，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const observations = (items, heading) => items?.length > 0 && (
    <section className="growth-review-section">
      <h4>{heading}</h4>
      {items.map((item, index) => (
        <article className="growth-observation" key={index}>
          <h5>{item.title}</h5>
          <p>{item.description}</p>
          <div className="growth-evidence">
            <span>参考练习：</span>
            {item.evidence_ids.map(id => sources.get(id) && (
              <button type="button" key={id} onClick={() => onOpenConversation(sources.get(id))}>
                {sources.get(id).title}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );

  return (
    <section className="dash-card wide growth-insight" aria-labelledby="growth-insight-title">
      <div className="growth-insight-header">
        <h3 id="growth-insight-title">综合回顾与成长建议</h3>
        {canGenerate && <button type="button" className="btn secondary" onClick={generate} disabled={isGenerating || !userId}>
          {isGenerating ? '正在整理…' : !insight ? '生成成长回顾' : insight.stale ? '更新回顾' : '重新生成'}
        </button>}
      </div>
      {insight && <p className="growth-insight-meta">
        根据最近 {insight.based_on_sessions} 次练习 · {new Date(insight.generated_at).toLocaleString('zh-CN')} 更新
      </p>}
      {insight?.stale && <p className="growth-insight-notice">练习记录已变化，可以更新回顾。</p>}
      {isGenerating && <p className="growth-insight-status" role="status">正在回看你的练习，整理近期的尝试与下一步建议…</p>}
      {error && <div className="growth-insight-error" role="alert">
        <p>{error}</p>
        <button type="button" className="btn secondary" disabled={isGenerating} onClick={generate}>重新尝试</button>
      </div>}
      {content ? <>
        <p className="growth-overview">{content.overview}</p>
        <div className="growth-observations">
          {observations(content.progress, '已有的尝试')}
          {observations(content.patterns, '值得留意的模式')}
        </div>
        <section className="growth-review-section growth-next-steps">
          <h4>接下来可以尝试</h4>
          <ol>{content.suggestions.map((item, index) => <li key={index}>
            <h5>{item.title}</h5><p>{item.action}</p><p className="growth-advice-reason">{item.reason}</p>
          </li>)}</ol>
        </section>
        <p className="growth-reflection">想一想：{content.reflection_question}</p>
      </> : !isGenerating && <div className="growth-insight-empty">
        <p>{canGenerate ? '把近期的练习放在一起，回看已有的尝试、常出现的想法，以及接下来可以做的一小步。'
          : '先进行一次复盘或模拟对话，再回看你的尝试与成长。'}</p>
        {!canGenerate && <button type="button" className="btn secondary" onClick={onStartPractice}>开始一次练习</button>}
      </div>}
    </section>
  );
}
