import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiService } from './services/api';
import './index.css';

// ============================================================
// Icon Components (inline SVG — no external dependency needed)
// ============================================================

const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconBot = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
  </svg>
);

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconSparkles = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
  </svg>
);

const IconReview = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconSimulation = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
  </svg>
);

const IconActivity = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);

const IconAlert = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const IconHistory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
  </svg>
);

const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const IconMic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
  </svg>
);

const IconHelp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconSun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
  </svg>
);

const IconMoon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </svg>
);

// ============================================================
// Cognitive bias type Chinese labels
// ============================================================
const BIAS_LABELS = {
  mind_reading: '读心倾向',
  catastrophizing: '灾难化思维',
  overgeneralization: '过度泛化',
  personalizing: '自我否定',
  negative_filtering: '负面过滤',
  all_or_nothing: '非黑即白',
};

const BIAS_DESCRIPTIONS = {
  mind_reading: '在没有充分证据的情况下，断定别人对自己有负面的看法。',
  catastrophizing: '将事情的结果想象得极其糟糕，甚至不可挽回。',
  overgeneralization: '基于单一事件，得出普遍的负面结论。',
  personalizing: '将与自己无关或关系不大的负面事件完全归咎于自己。',
  negative_filtering: '只关注事物消极的一面，忽略积极或中性的信息。',
  all_or_nothing: '以极端、绝对的方式看待事物（非黑即白）。',
};

// ============================================================
// Quick-start suggestion prompts
// ============================================================
const SUGGESTIONS = [
  '今天课堂被点名回答问题，结结巴巴的，感觉所有人都在笑话我…',
  '我给同学发消息，对方过了好久才回复一个"嗯"，我是不是太烦人了？',
  '社团面试没通过，我觉得自己什么都做不好…',
  '室友聚餐没叫我，我怀疑他们是不是不喜欢我。',
];

// ============================================================
// App Component
// ============================================================
function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('echo-theme') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('echo-theme', theme);
  }, [theme]);

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [activeNav, setActiveNav] = useState('review');
  
  // New States for Simulation and Growth
  const [scenarios, setScenarios] = useState([]);
  const [pendingScenario, setPendingScenario] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [customOptions, setCustomOptions] = useState({});
  const [growthData, setGrowthData] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentReport, setCurrentReport] = useState('');
  const [isEnding, setIsEnding] = useState(false);
  const [generatingReportId, setGeneratingReportId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  // Hint State
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintReason, setHintReason] = useState('');
  const [hintResult, setHintResult] = useState(null);
  const [isFetchingHint, setIsFetchingHint] = useState(false);
  const [currentScore, setCurrentScore] = useState(null);
  
  // Speech Recognition Ref
  const recognitionRef = useRef(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ---- Init data on mount ----
  useEffect(() => {
    const initData = async () => {
      try {
        const u = await apiService.getOrCreateUser('EchoUser');
        setUser(u);
        const sc = await apiService.getScenarios();
        setScenarios(sc);
        const growth = await apiService.getGrowthData(u.id);
        setGrowthData(growth);
      } catch (err) {
        console.error('Failed to init:', err);
        setUser({ id: 1, nickname: 'EchoUser', anxiety_level: 60 });
      }
    };
    initData();

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN'; // Set to Chinese
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // ---- Auto-scroll ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activeNav]);

  // ---- Navigation Handler ----
  const handleNavChange = async (nav) => {
    setActiveNav(nav);
    if (nav === 'growth') {
      if (user) {
        try {
          const data = await apiService.getGrowthData(user.id);
          setGrowthData(data);
        } catch (err) {
          console.error('Failed to fetch growth data:', err);
        }
      }
    } else if (nav === 'history') {
      if (user) {
        try {
          const history = await apiService.getConversations(user.id);
          setHistoryList(history);
        } catch (err) {
          console.error('Failed to fetch history:', err);
        }
      }
    } else {
      handleNewChat();
      setSelectedScenario(null);
      setPendingScenario(null);
    }
  };

  // ---- Send message handler ----
  const handleSend = async (text) => {
    const content = (text || inputValue).trim();
    if (!content || isLoading) return;

    setInputValue('');
    const userMsg = { id: `u-${Date.now()}`, role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const botMsgId = `b-${Date.now()}`;
    try {
      let botContent = '';
      
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          role: 'assistant',
          content: '',
          emotion: null,
          biases: null,
          isStreaming: true
        }
      ]);

      await apiService.sendMessage({
        userId: user.id,
        conversationId,
        sessionType: activeNav,
        scenarioId: selectedScenario?.id,
        customOptions: customOptions,
        content,
        onChunk: (chunk) => {
          if (chunk.type === 'content') {
            botContent += chunk.content;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId ? { ...msg, content: botContent } : msg
              )
            );
          } else if (chunk.type === 'analysis') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? {
                      ...msg,
                      emotion: chunk.emotion_analysis,
                      biases: chunk.cognitive_biases,
                      isStreaming: false
                    }
                  : msg
              )
            );
          } else if (chunk.type === 'conv_id') {
            setConversationId(chunk.conversation_id);
          } else if (chunk.type === 'error') {
            console.error("SSE Error:", chunk.content);
          }
        }
      });

      // Clear the streaming flag upon successful stream completion
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
        )
      );
    } catch (err) {
      console.error('Send failed:', err);
      setMessages((prev) => [
        ...prev.filter((msg) => msg.id !== botMsgId),
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: '抱歉，连接出现问题。请检查后端服务是否在运行，然后重试。',
          isError: true
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleRetry = async () => {
    const lastUserMsgIndex = messages.map(m => m.role).lastIndexOf('user');
    if (lastUserMsgIndex === -1) return;
    
    const lastUserMsg = messages[lastUserMsgIndex];
    
    // Remove the error message
    setMessages(prev => prev.filter(m => !m.isError));
    
    setIsLoading(true);
    const botMsgId = `b-${Date.now()}`;
    try {
      let botContent = '';
      
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          role: 'assistant',
          content: '',
          emotion: null,
          biases: null,
          isStreaming: true
        }
      ]);

      await apiService.sendMessage({
        userId: user.id,
        conversationId,
        sessionType: activeNav,
        scenarioId: selectedScenario?.id,
        customOptions: customOptions,
        content: lastUserMsg.content,
        onChunk: (chunk) => {
          if (chunk.type === 'content') {
            botContent += chunk.content;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId ? { ...msg, content: botContent } : msg
              )
            );
          } else if (chunk.type === 'analysis') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? {
                      ...msg,
                      emotion: chunk.emotion_analysis,
                      biases: chunk.cognitive_biases,
                      isStreaming: false
                    }
                  : msg
              )
            );
          } else if (chunk.type === 'conv_id') {
            setConversationId(chunk.conversation_id);
          } else if (chunk.type === 'error') {
            console.error("SSE Error:", chunk.content);
          }
        }
      });

      // Clear the streaming flag upon successful stream completion
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
        )
      );
    } catch (err) {
      console.error('Retry failed:', err);
      setMessages((prev) => [
        ...prev.filter((msg) => msg.id !== botMsgId),
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: '抱歉，连接依然存在问题。请重试。',
          isError: true
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  // ---- New conversation ----
  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInputValue('');
    setSelectedScenario(null);
    setPendingScenario(null);
    setCustomOptions({});
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  // ---- Select Scenario ----
  const handleSelectScenarioClick = (scenario) => {
    if (scenario.configurable_options && scenario.configurable_options.length > 0) {
      // Initialize default options
      const defaultOpts = {};
      scenario.configurable_options.forEach(opt => {
        defaultOpts[opt.id] = opt.options[0];
      });
      setCustomOptions(defaultOpts);
      setPendingScenario(scenario);
    } else {
      handleStartSimulation(scenario, {});
    }
  };

  const handleStartSimulation = (scenario, opts) => {
    setPendingScenario(null);
    setSelectedScenario(scenario);
    setCustomOptions(opts);
    
    let optStr = '';
    if (Object.keys(opts).length > 0) {
        optStr = ' (' + Object.values(opts).join(', ') + ')';
    }
    
    setMessages([
      {
        id: `b-init-${Date.now()}`,
        role: 'assistant',
        content: `【已进入场景】\n对方：${scenario.role_name}${optStr}\n\n"${scenario.opening || '你好！'}"`
      }
    ]);
  };

  // ---- End Conversation ----
  const handleEndConversation = async () => {
    if (!conversationId) return;
    setIsEnding(true);
    try {
      const res = await apiService.endConversation(conversationId);
      setCurrentReport(res.summary);
      setCurrentScore(res.score);
      setShowReportModal(true);
      
      // Update growth data
      if (user) {
        const growth = await apiService.getGrowthData(user.id);
        setGrowthData(growth);
      }
    } catch (err) {
      console.error('Failed to end conversation:', err);
      alert('结束对话并生成报告失败，请重试。');
    } finally {
      setIsEnding(false);
    }
  };
  
  const handleViewHistoryReport = async (e, conv) => {
    e.stopPropagation();
    try {
      const detail = await apiService.getConversationDetail(conv.id);
      setCurrentReport(detail.summary || '该次对话过短，未生成分析报告。');
      setCurrentScore(detail.score);
      setShowReportModal(true);
    } catch (err) {
      console.error('Failed to view history report', err);
    }
  };

  const handleLoadHistoryChat = async (conv) => {
    try {
      const detail = await apiService.getConversationDetail(conv.id);
      
      const loadedMessages = detail.messages.map((m, idx) => ({
        id: `m-${idx}-${Date.now()}`,
        role: m.role,
        content: m.content
      }));
      
      setMessages(loadedMessages);
      setConversationId(detail.id);
      setPendingScenario({ title: detail.title }); 
      setActiveNav('history_view');
    } catch (err) {
      console.error('Failed to load history chat', err);
    }
  };

  const handleGenerateHistoryReport = async (e, convId) => {
    e.stopPropagation();
    setGeneratingReportId(convId);
    try {
      const res = await apiService.endConversation(convId);
      
      setHistoryList(prev => prev.map(c => 
        c.id === convId ? { ...c, has_summary: true, score: res.score } : c
      ));
      
      setCurrentReport(res.summary);
      setCurrentScore(res.score);
      setShowReportModal(true);
      
      // Update growth data
      if (user) {
        const growth = await apiService.getGrowthData(user.id);
        setGrowthData(growth);
      }
    } catch (err) {
      console.error('Failed to generate report for history', err);
      alert('生成报告失败，可能对话太短。');
    } finally {
      setGeneratingReportId(null);
    }
  };

  const handleDeleteHistory = async (e, convId) => {
    e.stopPropagation();
    setDeleteConfirmId(convId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await apiService.deleteConversation(deleteConfirmId);
      setHistoryList(prev => prev.filter(c => c.id !== deleteConfirmId));
      if (conversationId === deleteConfirmId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete history', err);
      alert('删除失败，请重试。');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // ---- Hint Handlers ----
  const handleGetHint = async () => {
    if (!hintReason.trim()) {
      alert('请输入你的犹豫或困惑原因。');
      return;
    }
    setIsFetchingHint(true);
    try {
      const result = await apiService.getSimulationHint(conversationId, hintReason);
      setHintResult(result);
    } catch (err) {
      console.error('Failed to fetch hint', err);
      alert('获取建议失败，请稍后重试。');
    } finally {
      setIsFetchingHint(false);
    }
  };

  const handleUseHint = () => {
    if (hintResult && hintResult.suggested_reply) {
      setInputValue(hintResult.suggested_reply);
      setShowHintModal(false);
      setHintReason('');
      setHintResult(null);
      inputRef.current?.focus();
    }
  };

  // ============================================================
  // Render Helpers
  // ============================================================
  
  const isInputDisabled = isLoading || isEnding || activeNav === 'growth' || activeNav === 'history' || (activeNav === 'simulation' && !selectedScenario);
  
  const getPlaceholder = () => {
    if (activeNav === 'growth') return '在成长记录中不可发送消息...';
    if (activeNav === 'history') return '在历史记录中不可发送消息...';
    if (activeNav === 'simulation') {
      if (pendingScenario) return '请先配置场景参数...';
      return selectedScenario ? '输入你的回答...' : '请先在上方选择一个模拟场景...';
    }
    return '描述一下让你感到焦虑的社交情景…';
  };

  // ---- Voice Recording ----
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("你的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器。");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recording", err);
      }
    }
  };

  const getGrowthStatus = () => {
    if (!growthData) return { text: '🌱 尚未开启', percent: 0 };
    const count = growthData.total_sessions;
    if (count <= 10) {
      return { text: '🌱 破土萌芽', percent: (count / 10) * 100 };
    } else if (count <= 30) {
      return { text: '🌿 茁壮成长', percent: ((count - 10) / 20) * 100 };
    } else if (count <= 100) {
      return { text: '🌳 枝繁叶茂', percent: ((count - 30) / 70) * 100 };
    } else {
      return { text: '🌟 社交达人', percent: 100 };
    }
  };

  const statusInfo = getGrowthStatus();

  return (
    <div className="app-layout">
      {/* ---- SIDEBAR ---- */}
      <aside className="sidebar">
        <div className="sidebar-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-icon">🫧</div>
            <span className="brand-text">Echo</span>
          </div>
          <button 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} 
            className="theme-toggle-btn"
            title={theme === 'dark' ? '切换至亮色模式' : '切换至深色模式'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
              outline: 'none'
            }}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>

        {/* Navigation */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">功能模块</div>
          <div className={`nav-item ${activeNav === 'review' ? 'active' : ''}`}
               onClick={() => handleNavChange('review')}>
            <span className="nav-icon"><IconReview /></span>
            情景复盘
          </div>
          <div className={`nav-item ${activeNav === 'simulation' ? 'active' : ''}`}
               onClick={() => handleNavChange('simulation')}>
            <span className="nav-icon"><IconSimulation /></span>
            社交模拟
          </div>
          <div className={`nav-item ${activeNav === 'growth' ? 'active' : ''}`}
               onClick={() => handleNavChange('growth')}>
            <span className="nav-icon"><IconChart /></span>
            成长记录
          </div>
          <div className={`nav-item ${activeNav === 'history' ? 'active' : ''}`}
               onClick={() => handleNavChange('history')}>
            <span className="nav-icon"><IconHistory /></span>
            历史记录
          </div>
        </div>

        {/* Status Card */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">当前状态</div>
          <div className="status-card">
            <div className="status-row">
              <span className="status-label">状态</span>
              <span className="status-value status-text">{statusInfo.text}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(Math.max(statusInfo.percent, 0), 100)}%` }} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
              已完成 {growthData?.total_sessions || 0} 次对话
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <p>Echo · AI 社交焦虑认知训练系统</p>
        </div>
      </aside>

      {/* ---- MAIN CONTENT ---- */}
      <main className="main-content">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeNav === 'simulation' && (selectedScenario || pendingScenario) && (
              <span 
                className="back-button" 
                onClick={handleNewChat}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', marginRight: '4px', transition: 'color var(--transition-fast)' }}
                title="返回场景列表"
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <IconBack />
              </span>
            )}
            <span className="header-icon"><IconSparkles /></span>
            {activeNav === 'review' ? '情景复盘与认知重构' :
             activeNav === 'simulation' ? (
                (selectedScenario || pendingScenario)
                  ? `社交模拟训练 · ${(selectedScenario || pendingScenario).title}`
                  : '社交模拟训练'
             ) : activeNav === 'growth' ? '成长记录' : 
                 activeNav === 'history_view' ? `历史记录 · ${pendingScenario?.title || ''}` : '历史记录'}
          </div>
          {conversationId && activeNav !== 'simulation' && activeNav !== 'history' && activeNav !== 'history_view' && (
            <span className="chat-header-badge" onClick={handleNewChat} style={{ cursor: 'pointer' }}>
              + 新对话
            </span>
          )}
          {activeNav === 'history_view' && (
            <span className="chat-header-badge" onClick={() => handleNavChange('history')} style={{ cursor: 'pointer' }}>
              &larr; 返回列表
            </span>
          )}
          {conversationId && (activeNav === 'simulation' || activeNav === 'review') && (
            <span className="chat-header-badge" onClick={handleEndConversation} style={{ cursor: 'pointer', background: 'var(--accent-glow)', color: 'var(--accent-bright)' }}>
              {isEnding ? '生成报告中...' : '结束对话'}
            </span>
          )}
        </div>

        {/* Dynamic Content Area */}
        <div className="messages-container">
          {activeNav === 'growth' ? (
            /* ---- GROWTH RECORD ---- */
            <div className="dashboard">
              <div className="dash-header">
                <h2 className="dash-title">成长记录</h2>
                <p className="dash-subtitle">记录你的认知行为改变轨迹</p>
              </div>
              {growthData ? (
                <div className="dash-grid">
                  <div className="dash-card">
                    <div className="dash-stat-value">{growthData.total_sessions}</div>
                    <div className="dash-stat-label">总复盘与训练次数</div>
                  </div>
                  <div className="dash-card">
                    <div className="dash-stat-value">{growthData.total_emotions_logged}</div>
                    <div className="dash-stat-label">情绪觉察记录数</div>
                  </div>
                  <div className="dash-card">
                    <div className="dash-stat-value">{growthData.anxiety_level}</div>
                    <div className="dash-stat-label">基础焦虑评估分</div>
                  </div>
                  <div className="dash-card wide">
                    <div className="dash-stat-label">最常出现的认知偏差</div>
                    <div className="dash-list-vertical">
                      {growthData.top_biases?.length > 0 ? (
                        growthData.top_biases.map(b => (
                          <div key={b.type} className="bias-detail-card">
                            <div className="bias-detail-header">
                              <span className="tag bias" style={{ fontSize: '14px', padding: '6px 12px', margin: 0 }}>
                                <span className="tag-icon"><IconAlert /></span>
                                {BIAS_LABELS[b.type] || b.type}
                              </span>
                              <span className="bias-count">{b.count} 次</span>
                            </div>
                            <div className="bias-detail-desc">
                              {BIAS_DESCRIPTIONS[b.type] || '一种常见的认知偏差模式。'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>暂无足够数据分析认知偏差</div>
                      )}
                    </div>
                  </div>
                  <div className="dash-card wide">
                    <div className="dash-stat-label">情绪觉察频率统计</div>
                    <div className="dash-list">
                      {growthData.recent_emotions?.length > 0 ? (
                        growthData.recent_emotions.map((e, i) => (
                          <div key={i} className="emo-count-card">
                            <span className="tag emotion" style={{ fontSize: '13px' }}>
                              {e.emotion}
                            </span>
                            <span className="emo-count-badge">{e.count} 次</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>暂无情绪记录</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
                  <div className="typing-dot" style={{ display: 'inline-block', marginRight: '5px' }}></div>
                  <div className="typing-dot" style={{ display: 'inline-block', marginRight: '5px', animationDelay: '0.15s' }}></div>
                  <div className="typing-dot" style={{ display: 'inline-block', animationDelay: '0.3s' }}></div>
                </div>
              )}
            </div>
          ) : activeNav === 'history' ? (
            /* ---- HISTORY LIST ---- */
            <div className="dashboard">
              <div className="dash-header" style={{ marginBottom: '24px' }}>
                <h2 className="dash-title">历史记录</h2>
                <p className="dash-subtitle">回顾你过去的对话与AI分析报告</p>
              </div>
              <div className="history-list">
                {historyList.length > 0 ? historyList.map(conv => (
                  <div key={conv.id} className="history-item" onClick={() => handleLoadHistoryChat(conv)}>
                    <div>
                      <div className="history-title">
                        {conv.title}
                        {conv.score !== null && conv.score !== undefined && (
                          <span style={{ marginLeft: '8px', fontSize: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px' }}>
                            {conv.score} 分
                          </span>
                        )}
                      </div>
                      <div className="history-meta">
                        {conv.type === 'simulation' ? '社交模拟' : '情景复盘'} · {new Date(conv.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="history-item-actions">
                      {conv.has_summary ? (
                        <div 
                          style={{ color: 'var(--accent)', cursor: 'pointer', marginRight: '8px', fontSize: '14px', fontWeight: '500' }}
                          onClick={(e) => handleViewHistoryReport(e, conv)}
                        >
                          查看报告 &rarr;
                        </div>
                      ) : (
                        <button 
                          className="btn primary" 
                          style={{ padding: '4px 12px', fontSize: '12px', marginRight: '8px' }}
                          onClick={(e) => handleGenerateHistoryReport(e, conv.id)}
                          disabled={generatingReportId === conv.id}
                        >
                          {generatingReportId === conv.id ? '生成中...' : '生成报告'}
                        </button>
                      )}
                      <button 
                        className="history-delete-btn" 
                        onClick={(e) => handleDeleteHistory(e, conv.id)}
                        title="删除记录"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>暂无历史记录</div>
                )}
              </div>
            </div>
          ) : activeNav === 'simulation' && pendingScenario ? (
            /* ---- SCENARIO CONFIGURATION ---- */
            <div className="scenario-config">
              <div className="config-header">
                <div className="scenario-icon">{pendingScenario.icon}</div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{pendingScenario.title}设定</h3>
                  <p className="scenario-desc" style={{ marginTop: '4px' }}>自定义对方的特征，增加训练难度或贴合真实情况</p>
                </div>
              </div>
              <div className="config-options">
                {pendingScenario.configurable_options?.map(opt => (
                  <div key={opt.id} className="config-group">
                    <label className="config-label">{opt.label}</label>
                    <select 
                      className="config-select"
                      value={customOptions[opt.id] || ''}
                      onChange={(e) => setCustomOptions(prev => ({ ...prev, [opt.id]: e.target.value }))}
                    >
                      {opt.options.map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="config-actions">
                <button className="btn secondary" onClick={() => setPendingScenario(null)}>返回重选</button>
                <button className="btn primary" onClick={() => handleStartSimulation(pendingScenario, customOptions)}>开始对话</button>
              </div>
            </div>
          ) : activeNav === 'simulation' && !selectedScenario ? (
            /* ---- SCENARIO SELECTOR ---- */
            <div className="dashboard">
              <div className="dash-header" style={{ marginBottom: '24px' }}>
                <h2 className="dash-title">选择训练场景</h2>
                <p className="dash-subtitle">在低风险的环境中，和 AI 扮演的各种角色练习对话技巧</p>
              </div>
              <div className="scenario-grid">
                {scenarios.map(s => (
                  <div key={s.id} className="scenario-card" onClick={() => handleSelectScenarioClick(s)}>
                    <div className="scenario-icon">{s.icon}</div>
                    <div className="scenario-title">{s.title}</div>
                    <div className="scenario-desc">{s.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ---- MESSAGES LIST (Review & Active Simulation & History View) ---- */
            <div className="messages-list">
              {messages.length === 0 && activeNav === 'review' ? (
                /* ---- Welcome State ---- */
                <div className="welcome-state">
                  <div className="welcome-icon-ring">🫧</div>
                  <h2 className="welcome-title">嗨，欢迎来到 Echo</h2>
                  <p className="welcome-subtitle">
                    我是你的 AI 认知训练助手。
                    你可以告诉我最近在社交中遇到的困扰，我会帮你分析情绪和思维模式，
                    一起找到更客观的视角。
                  </p>
                  <div className="welcome-suggestions">
                    {SUGGESTIONS.map((s, i) => (
                      <div key={i} className="suggestion-chip" onClick={() => handleSend(s)}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`message-row ${msg.role === 'user' ? 'user' : ''}`}>
                    <div className={`avatar ${msg.role === 'user' ? 'human' : 'bot'}`}>
                      {msg.role === 'user' ? <IconUser /> : <IconBot />}
                    </div>
                    <div className="message-body">
                      <div className={`bubble ${msg.role === 'user' ? 'user' : 'bot'} ${msg.isError ? 'error' : ''}`}>
                        {msg.content ? msg.content : (msg.isStreaming && (
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', height: '18px', padding: '2px 0' }}>
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                          </div>
                        ))}
                        {msg.isError && (
                          <div style={{ marginTop: '12px' }}>
                            <button 
                               className="btn primary" 
                               style={{ padding: '6px 16px', fontSize: '13px' }} 
                               onClick={handleRetry}
                               disabled={isLoading}
                            >
                               重试请求
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Analysis tags for bot messages (only if they exist, which means it's review mode) */}
                      {msg.role === 'assistant' && msg.emotion?.emotion && (
                        <div className="analysis-tags">
                          <span className="tag emotion">
                            <span className="tag-icon"><IconActivity /></span>
                            情绪: {msg.emotion.emotion}
                            {msg.emotion.intensity != null && ` · ${Math.round(msg.emotion.intensity * 100)}%`}
                          </span>
                          {msg.emotion.anxiety_level && (
                            <span className="tag info">
                              焦虑等级: {msg.emotion.anxiety_level}
                            </span>
                          )}
                          {msg.biases?.detected_biases?.map((b, i) => (
                            <span key={i} className="tag bias" title={b.explanation}>
                              <span className="tag-icon"><IconAlert /></span>
                              {BIAS_LABELS[b.bias_type] || b.bias_type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Typing indicator */}
              {isLoading && !messages.some(m => m.isStreaming) && (
                <div className="typing-indicator">
                  <div className="avatar bot"><IconBot /></div>
                  <div className="typing-dots">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        {(activeNav === 'review' || (activeNav === 'simulation' && selectedScenario)) && (
          <div className="input-area">
            <div className="input-wrapper">
              <form className="input-box" onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  className="input-field"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={getPlaceholder()}
                  disabled={isInputDisabled}
                />
                
                {activeNav === 'simulation' && selectedScenario && messages.length > 0 && (
                  <button 
                    type="button" 
                    className="hint-btn" 
                    onClick={() => setShowHintModal(true)}
                    disabled={isInputDisabled}
                    title="不知道怎么回？点击求助"
                  >
                    <IconHelp />
                    <span>怎么办？</span>
                  </button>
                )}

                <button
                  type="button"
                  className={`mic-btn ${isRecording ? 'recording' : ''}`}
                  onClick={toggleRecording}
                  disabled={isInputDisabled}
                  title={isRecording ? "停止录音" : "语音输入"}
                >
                  <IconMic />
                </button>
                <button
                  type="submit"
                  className="send-btn"
                  disabled={!inputValue.trim() || isInputDisabled}
                >
                  <IconSend />
                </button>
              </form>
              <div className="input-disclaimer">
                {activeNav === 'simulation' 
                  ? 'AI 扮演的模拟角色回复仅供练习参考，请以轻松的心态进行对话。'
                  : 'Echo 基于 CBT 认知行为疗法框架提供引导，不替代专业心理咨询。'}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ---- REPORT MODAL ---- */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => { 
          setShowReportModal(false); 
          if (activeNav !== 'history') handleNewChat(); 
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconSparkles />
                本次对话分析报告
              </div>
              {currentScore !== null && currentScore !== undefined && (
                <div style={{ background: 'var(--accent-glow)', color: 'var(--accent-bright)', padding: '4px 12px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                  {currentScore} 分
                </div>
              )}
            </div>
            <div className="report-body markdown-body">
              {currentReport ? <ReactMarkdown>{currentReport}</ReactMarkdown> : "生成报告失败，或对话太短未能生成总结。"}
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => { 
                setShowReportModal(false); 
                if (activeNav !== 'history') handleNewChat(); 
              }}>
                {activeNav === 'history' ? '我知道了' : '完成并开启新对话'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- DELETE CONFIRM MODAL ---- */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ color: '#ff4d4d' }}>
              <IconAlert />
              确认删除
            </div>
            <div className="report-body">
              确定要删除这条历史记录吗？删除后将无法恢复。
            </div>
            <div className="modal-actions" style={{ gap: '12px' }}>
              <button className="btn secondary" onClick={() => setDeleteConfirmId(null)}>
                取消
              </button>
              <button className="btn primary" style={{ background: '#ff4d4d', borderColor: '#ff4d4d' }} onClick={confirmDelete}>
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- HINT MODAL ---- */}
      {showHintModal && (
        <div className="modal-overlay" onClick={() => { setShowHintModal(false); setHintResult(null); setHintReason(''); }}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <IconHelp />
              遇到困难了？
            </div>
            
            {!hintResult ? (
              <>
                <div className="report-body" style={{ marginBottom: '16px' }}>
                  描述一下你觉得犹豫或不知道怎么回答的理由，AI教练会根据当前场景为你提供回复建议：
                </div>
                <textarea 
                  className="input-field" 
                  style={{ width: '100%', minHeight: '100px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', resize: 'vertical' }}
                  placeholder="例如：我怕拒绝她会让她不高兴..."
                  value={hintReason}
                  onChange={e => setHintReason(e.target.value)}
                  autoFocus
                />
                <div className="modal-actions" style={{ gap: '12px', marginTop: '16px' }}>
                  <button className="btn secondary" onClick={() => { setShowHintModal(false); setHintReason(''); }}>取消</button>
                  <button className="btn primary" onClick={handleGetHint} disabled={isFetchingHint || !hintReason.trim()}>
                    {isFetchingHint ? '分析中...' : '获取建议'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="report-body">
                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                    <strong>建议回复：</strong><br/>
                    <span style={{ color: 'var(--text-primary)' }}>"{hintResult.suggested_reply}"</span>
                  </div>
                  <div>
                    <strong>教练解析：</strong><br/>
                    {hintResult.reasoning}
                  </div>
                </div>
                <div className="modal-actions" style={{ gap: '12px', marginTop: '24px' }}>
                  <button className="btn secondary" onClick={() => setHintResult(null)}>返回重写</button>
                  <button className="btn primary" onClick={handleUseHint}>使用此建议</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---- FULLPAGE LOADING OVERLAY ---- */}
      {(isEnding || generatingReportId) && (
        <div className="fullpage-loading-overlay">
          <div className="loading-container">
            <div className="loading-pulse-ring">
              <IconSparkles />
            </div>
            <div className="loading-text">正在生成心理成长报告</div>
            <div className="loading-subtitle">
              AI 认知教练正在深度复盘本次对话<br />
              为您梳理情绪觉察、认知偏差和下一步行动建议...
            </div>
            <div className="loading-bar-container">
              <div className="loading-bar-fill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
