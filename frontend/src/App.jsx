import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiService } from './services/api';
import './index.css';
import GrowthInsight from './components/GrowthInsight';
import { getEmotionLabel } from './utils/emotionLabels';
import { emptyChatDraft, useChatDrafts } from './hooks/useChatDrafts';

const PRODUCT_SLOGAN = '另一种解读，另一种可能。';
const PRODUCT_SLOGAN_EN = 'Another perspective. Another possibility.';
const SUPPORT_NOTICE = '本产品提供社交练习与自我反思支持，不能替代专业心理咨询。如有需要，请寻求专业帮助。';

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

const BrandMark = () => (
  <img className="brand-mark" src="/maybe-mark.png" width="587" height="485" alt="" aria-hidden="true" />
);

const NAV_ITEMS = [
  { id: 'review', label: '情景复盘', icon: IconReview },
  { id: 'simulation', label: '社交模拟', icon: IconSimulation },
  { id: 'growth', label: '成长记录', icon: IconChart },
  { id: 'history', label: '历史记录', icon: IconHistory },
];

function Navigation({ activeNav, onChange, disabled = false, className = '' }) {
  return (
    <nav className={className} aria-label="主要功能">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          type="button"
          key={id}
          className={`nav-item ${activeNav === id || (id === 'history' && activeNav === 'history_view') ? 'active' : ''}`}
          aria-current={activeNav === id || (id === 'history' && activeNav === 'history_view') ? 'page' : undefined}
          onClick={() => onChange(id)}
          disabled={disabled}
        >
          <span className="nav-icon"><Icon /></span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

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
function App({ profile, onProfileChange, initialNav }) {
  const isExample = profile === 'example';
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('maybe-theme') === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('maybe-theme', theme);
  }, [theme]);

  const [user, setUser] = useState(null);
  const {
    messages, setMessages, inputValue, setInputValue, conversationId, setConversationId,
    pendingScenario, setPendingScenario, selectedScenario, setSelectedScenario,
    customOptions, setCustomOptions, title: chatTitle, fromHistory,
    chatType, selectChatType, replaceDraft, appendSpeech, markSpeechTarget,
  } = useChatDrafts(initialNav === 'simulation' ? 'simulation' : 'review');
  const [isLoading, setIsLoading] = useState(false);
  const [activeNav, setActiveNav] = useState(isExample ? 'growth' : initialNav);
  
  // New States for Simulation and Growth
  const [scenarios, setScenarios] = useState([]);
  const [growthData, setGrowthData] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
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
  const messageSequence = useRef(0);
  const nextMessageId = (prefix) => `${prefix}-${++messageSequence.current}`;

  // ---- Init data on mount ----
  useEffect(() => {
    const initData = async () => {
      let activeUser;
      try {
        // Keep the existing account key so previous conversations remain available.
        activeUser = profile === 'example'
          ? await apiService.getExampleProfile()
          : await apiService.getOrCreateUser('EchoUser');
        setUser(activeUser);
      } catch (err) {
        console.error('Failed to initialize user:', err);
        setPageError('暂时没能加载练习内容，请稍后再试。');
        setIsPageLoading(false);
        return;
      }

      try {
        const sc = await apiService.getScenarios();
        setScenarios(sc);
      } catch (err) {
        console.error('Failed to fetch scenarios:', err);
      }

      try {
        const growth = await apiService.getGrowthData(activeUser.id);
        setGrowthData(growth);
      } catch (err) {
        console.error('Failed to fetch initial growth data:', err);
        setPageError('暂时没能加载练习内容，请稍后再试。');
      } finally {
        setIsPageLoading(false);
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
        appendSpeech(transcript);
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
    return () => recognitionRef.current?.abort();
  }, [profile, appendSpeech]);

  const ensureUser = async () => {
    if (user?.id) return user;
    const freshUser = isExample
      ? await apiService.getExampleProfile()
      : await apiService.getOrCreateUser('EchoUser');
    setUser(freshUser);
    return freshUser;
  };

  // ---- Auto-scroll ----
  useEffect(() => {
    if (messages.length > 0) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activeNav]);

  // ---- Navigation Handler ----
  const handleNavChange = async (nav) => {
    if (isPageLoading || isLoading || isEnding || generatingReportId) return;
    if (isExample && (nav === 'review' || nav === 'simulation')) {
      onProfileChange('personal', nav);
      return;
    }
    setActiveNav(nav);
    setPageError('');
    if (nav === 'review' || nav === 'simulation') {
      if (isRecording) recognitionRef.current?.stop();
      selectChatType(nav);
      setHintReason('');
      setHintResult(null);
    }
    if (nav === 'growth' || nav === 'history' || nav === 'simulation') {
      setIsPageLoading(true);
      try {
        if (nav === 'simulation') {
          setScenarios(await apiService.getScenarios());
        } else {
          const activeUser = await ensureUser();
          if (nav === 'growth') {
            const data = await apiService.getGrowthData(activeUser.id);
            setGrowthData(data);
          } else {
            const history = await apiService.getConversations(activeUser.id);
            setHistoryList(history);
          }
        }
      } catch (err) {
        console.error('Failed to load page:', err);
        setPageError('暂时没能加载内容，请稍后再试。');
      } finally {
        setIsPageLoading(false);
      }
    }
  };

  // ---- Send message handler ----
  const handleSend = async (text) => {
    const content = (text || inputValue).trim();
    if (!content || isLoading || isPageLoading || isExample) return;

    setInputValue('');
    const userMsg = { id: nextMessageId('u'), role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const botMsgId = nextMessageId('b');
    try {
      let botContent = '';
      const activeUser = await ensureUser();
      
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
        userId: activeUser.id,
        conversationId,
        sessionType: chatType,
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
            botContent = '这次回复暂时没能完成，请点击下方按钮重试。';
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? { ...msg, content: botContent, isStreaming: false, isError: true }
                  : msg
              )
            );
          }
        }
      });

      // Clear the streaming flag upon successful stream completion
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                content: msg.content || '这次回复暂时没能完成，请点击下方按钮重试。',
                isStreaming: false,
                isError: !msg.content
              }
            : msg
        )
      );
    } catch (err) {
      console.error('Send failed:', err);
      setMessages((prev) => [
        ...prev.filter((msg) => msg.id !== botMsgId),
        {
          id: nextMessageId('e'),
          role: 'assistant',
          content: '暂时没能收到回复。你的这条消息还在，可以稍后重试。',
          isError: true
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleRetry = async () => {
    if (isLoading || isPageLoading || isEnding || isExample) return;
    const lastUserMsgIndex = messages.map(m => m.role).lastIndexOf('user');
    if (lastUserMsgIndex === -1) return;
    
    const lastUserMsg = messages[lastUserMsgIndex];
    
    // Remove the error message
    setMessages(prev => prev.filter(m => !m.isError));
    
    setIsLoading(true);
    const botMsgId = nextMessageId('b');
    try {
      let botContent = '';
      const activeUser = await ensureUser();
      
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
        userId: activeUser.id,
        conversationId,
        sessionType: chatType,
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
            botContent = '这次回复暂时没能完成，请点击下方按钮重试。';
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? { ...msg, content: botContent, isStreaming: false, isError: true }
                  : msg
              )
            );
          }
        }
      });

      // Clear the streaming flag upon successful stream completion
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                content: msg.content || '这次回复暂时没能完成，请点击下方按钮重试。',
                isStreaming: false,
                isError: !msg.content
              }
            : msg
        )
      );
    } catch (err) {
      console.error('Retry failed:', err);
      setMessages((prev) => [
        ...prev.filter((msg) => msg.id !== botMsgId),
        {
          id: nextMessageId('e'),
          role: 'assistant',
          content: '暂时没能收到回复。你的这条消息还在，可以稍后重试。',
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
    replaceDraft(chatType, emptyChatDraft());
    setShowHintModal(false);
    setHintReason('');
    setHintResult(null);
    setCurrentScore(null);
    setCurrentReport('');
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
        id: nextMessageId('b-init'),
        role: 'assistant',
        content: `对方：${scenario.role_name}${optStr}\n\n“${scenario.opening || '你好！'}”`
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
    if (isPageLoading || isLoading || isEnding || generatingReportId) return;
    setIsPageLoading(true);
    setPageError('');
    try {
      const detail = await apiService.getConversationDetail(conv.id);
      const type = detail.type === 'simulation' ? 'simulation' : 'review';
      
      const loadedMessages = detail.messages.map((m, idx) => ({
        id: `history-${detail.id}-${idx}`,
        role: m.role,
        content: m.content,
        emotion: m.role === 'assistant' ? detail.messages[idx - 1]?.emotion_analysis : null,
        biases: m.role === 'assistant' ? detail.messages[idx - 1]?.cognitive_biases : null,
      }));

      const savedScenario = scenarios.find(item => item.id === detail.scenario_id);
      replaceDraft(type, {
        messages: loadedMessages, conversationId: detail.id,
        selectedScenario: type === 'simulation'
          ? savedScenario || { id: detail.scenario_id, title: detail.scenario_title || detail.title }
          : null,
        customOptions: detail.custom_options || {}, title: detail.title, fromHistory: true,
      });
      setHintReason('');
      setHintResult(null);
      setActiveNav(isExample || detail.read_only ? 'history_view' : type);
    } catch (err) {
      console.error('Failed to load history chat', err);
      setPageError('暂时没能打开这次对话，请返回历史记录后再试。');
    } finally {
      setIsPageLoading(false);
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
  
  const isInputDisabled = isExample || isPageLoading || isLoading || isEnding || activeNav === 'growth' || activeNav === 'history' || (activeNav === 'simulation' && !selectedScenario);
  
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
        markSpeechTarget();
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recording", err);
      }
    }
  };

  const getGrowthStatus = () => {
    if (!growthData?.total_sessions) return { text: '🌱 从一次练习开始', percent: 0 };
    const count = growthData.total_sessions;
    if (count <= 10) {
      return { text: '🌱 慢慢尝试', percent: (count / 10) * 100 };
    } else if (count <= 30) {
      return { text: '🌿 持续练习', percent: ((count - 10) / 20) * 100 };
    } else if (count <= 100) {
      return { text: '🌳 积累经验', percent: ((count - 30) / 70) * 100 };
    } else {
      return { text: '🌿 用自己的节奏', percent: 100 };
    }
  };

  const statusInfo = getGrowthStatus();

  return (
    <div className="app-layout">
      <div className="mobile-brand-bar">
        <div className="brand-lockup">
          <img className="brand-logo" src="/maybe-logo.png" width="1243" height="485" alt="未必 MAYBE" />
        </div>
        <button type="button" className="theme-toggle-btn" onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? '切换至亮色模式' : '切换至深色模式'}>
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
      {/* ---- SIDEBAR ---- */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-lockup">
            <img className="brand-logo" src="/maybe-logo.png" width="1243" height="485" alt="未必 MAYBE" />
          </div>
          <button 
            type="button"
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} 
            className="theme-toggle-btn"
            title={theme === 'dark' ? '切换至亮色模式' : '切换至深色模式'}
            aria-label={theme === 'dark' ? '切换至亮色模式' : '切换至深色模式'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>

        {/* Navigation */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">功能模块</div>
          <Navigation activeNav={activeNav} onChange={handleNavChange} disabled={isPageLoading || isLoading || isEnding || !!generatingReportId} />
        </div>

        {/* Status Card */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">练习足迹</div>
          <div className="status-card">
            <div className="status-row">
              <span className="status-label">你的节奏</span>
              <span className="status-value status-text">{statusInfo.text}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(Math.max(statusInfo.percent, 0), 100)}%` }} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
              已记录 {growthData?.total_sessions || 0} 次练习
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <p lang="en">{PRODUCT_SLOGAN_EN}</p>
        </div>
      </aside>

      {/* ---- MAIN CONTENT ---- */}
      <main className="main-content">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeNav === 'simulation' && (selectedScenario || pendingScenario) && (
              <button
                type="button"
                className="back-button" 
                onClick={handleNewChat}
                title="返回场景列表"
                aria-label="返回场景列表"
              >
                <IconBack />
              </button>
            )}
            <span className="header-icon"><IconSparkles /></span>
            <span className="chat-header-label">
            {activeNav === 'review' ? (chatTitle ? `情景复盘 · ${chatTitle}` : '情景复盘与认知重构') :
             activeNav === 'simulation' ? (
                (selectedScenario || pendingScenario)
                  ? `社交模拟训练 · ${(selectedScenario || pendingScenario).title}`
                  : '社交模拟训练'
             ) : activeNav === 'growth' ? '成长记录' : 
                 activeNav === 'history_view' ? `历史记录 · ${chatTitle}` : '历史记录'}
            </span>
          </div>
          <div className="header-actions">
          <button type="button" className="chat-header-badge profile-switch"
            onClick={() => onProfileChange(isExample ? 'personal' : 'example')}
            disabled={isPageLoading || isLoading || isEnding || !!generatingReportId}
          >
            {isExample ? '返回我的练习' : '查看使用示例'}
          </button>
          {conversationId && activeNav === 'review' && (
            <button type="button" className="chat-header-badge" onClick={handleNewChat} disabled={isLoading || isEnding}>
              + 新对话
            </button>
          )}
          {(activeNav === 'history_view' || (fromHistory && (activeNav === 'review' || activeNav === 'simulation'))) && (
            <button type="button" className="chat-header-badge" onClick={() => handleNavChange('history')} disabled={isLoading || isEnding}>
              &larr; 返回历史记录
            </button>
          )}
          {conversationId && (activeNav === 'simulation' || activeNav === 'review') && (
            <button type="button" className="chat-header-badge primary-action" onClick={handleEndConversation} disabled={isLoading || isEnding}>
              {isEnding ? '正在整理...' : '结束并回顾'}
            </button>
          )}
          </div>
        </div>

        <Navigation className="mobile-nav" activeNav={activeNav} onChange={handleNavChange} disabled={isPageLoading || isLoading || isEnding || !!generatingReportId} />

        {isExample && <div className="example-notice" role="note">
          <div><strong>林澄的练习记录 · 虚构示例</strong><p>查看四周的尝试与回顾。对话、报告和成长建议均为虚构示例。</p></div>
          <button type="button" className="btn secondary" onClick={() => onProfileChange('personal')}>开始自己的练习</button>
        </div>}

        {/* Dynamic Content Area */}
        <div className="messages-container">
          {isPageLoading || pageError ? (
            <div className="page-state" role="status">
              <div className="empty-state-icon"><IconReview /></div>
              <p>{isPageLoading ? '正在加载你的练习内容…' : pageError}</p>
              {!isPageLoading && <button type="button" className="btn secondary" onClick={() => handleNavChange(activeNav)}>重新加载</button>}
            </div>
          ) : activeNav === 'growth' ? (
            /* ---- GROWTH RECORD ---- */
            <div className="dashboard">
              <div className="dash-header">
                <h2 className="dash-title">成长记录</h2>
                <p className="dash-subtitle">看看你尝试过的练习，以及逐渐留意到的情绪和想法。</p>
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
                    <div className="empty-state-icon"><IconHistory /></div>
                    <div className="dash-stat-label">回看每一次尝试</div>
                    <button type="button" className="btn secondary growth-history-link" onClick={() => handleNavChange('history')}>查看练习记录</button>
                  </div>
                  <GrowthInsight
                    userId={user?.id}
                    insight={growthData.growth_insight}
                    canGenerate={growthData.can_generate_insight}
                    readOnly={isExample}
                    onUpdated={(insight) => setGrowthData(previous => previous ? { ...previous, growth_insight: insight } : previous)}
                    onOpenConversation={handleLoadHistoryChat}
                    onStartPractice={() => handleNavChange('review')}
                  />
                  <div className="dash-card wide">
                    <div className="dash-stat-label">值得留意的思维模式</div>
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
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>完成一次情景复盘后，可以在这里回看值得留意的想法。</div>
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
                              {getEmotionLabel(e.emotion)}
                            </span>
                            <span className="emo-count-badge">{e.count} 次</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>你的情绪觉察会随着练习慢慢积累。</div>
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
                <p className="dash-subtitle">回看过去的对话，整理当时的感受和下一次可以尝试的行动。</p>
              </div>
              <div className="history-list">
                {historyList.length > 0 ? historyList.map(conv => (
                  <article key={conv.id} className="history-item">
                    <button type="button" className="history-open" onClick={() => handleLoadHistoryChat(conv)}>
                      <span className="history-title">
                        {conv.title}
                        {conv.score !== null && conv.score !== undefined && (
                          <span className="report-score">
                            本次练习 {conv.score} 分
                          </span>
                        )}
                      </span>
                      <span className="history-meta">
                        {conv.type === 'simulation' ? '社交模拟' : '情景复盘'} · {new Date(conv.updated_at || conv.created_at).toLocaleString('zh-CN')} · {isExample ? '查看对话' : '继续对话'}
                      </span>
                    </button>
                    <div className="history-item-actions">
                      {conv.has_summary ? (
                        <button type="button" className="history-report-btn"
                          onClick={(e) => handleViewHistoryReport(e, conv)}
                        >
                          查看报告 &rarr;
                        </button>
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
                      {!isExample && <button
                        className="history-delete-btn" 
                        onClick={(e) => handleDeleteHistory(e, conv.id)}
                        title="删除记录"
                        aria-label={`删除记录：${conv.title}`}
                      >
                        <IconTrash />
                      </button>}
                    </div>
                  </article>
                )) : (
                  <div className="page-state">
                    <div className="empty-state-icon"><IconHistory /></div>
                    <h3>这里会留下你的练习足迹</h3>
                    <p>先聊聊一件让你在意的事，或试着练习一段社交对话。</p>
                    <div className="empty-state-actions">
                      <button type="button" className="btn primary" onClick={() => handleNavChange('review')}>开始情景复盘</button>
                      <button type="button" className="btn secondary" onClick={() => handleNavChange('simulation')}>试试社交模拟</button>
                    </div>
                  </div>
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
                    <label className="config-label" htmlFor={`scenario-${opt.id}`}>{opt.label}</label>
                    <select 
                      className="config-select"
                      id={`scenario-${opt.id}`}
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
                <p className="dash-subtitle">选一件你想尝试的小事。发出第一句回复后，可以点击“怎么办？”获取建议。</p>
              </div>
              <div className="scenario-grid">
                {scenarios.map(s => (
                  <button type="button" key={s.id} className="scenario-card" onClick={() => handleSelectScenarioClick(s)}>
                    <div className="scenario-icon">{s.icon}</div>
                    <div className="scenario-title">{s.title}</div>
                    <div className="scenario-desc">{s.description}</div>
                    <span className="scenario-cta">试试这个场景 <span aria-hidden="true">→</span></span>
                  </button>
                ))}
              </div>
              {scenarios.length === 0 && <div className="page-state"><p>暂时没有可选场景，请稍后重新加载。</p><button type="button" className="btn secondary" onClick={() => handleNavChange('simulation')}>重新加载</button></div>}
            </div>
          ) : (
            /* ---- MESSAGES LIST (Review & Active Simulation & History View) ---- */
            <div className="messages-list">
              {messages.length === 0 && activeNav === 'review' ? (
                /* ---- Welcome State ---- */
                <div className="welcome-state">
                  <div className="welcome-icon-ring"><BrandMark /></div>
                  <h2 className="welcome-title">欢迎来到「未必」</h2>
                  <p className="welcome-subtitle">{PRODUCT_SLOGAN}</p>
                  <p className="suggestions-label">选一个你有共鸣的情景，或写下最近让你在意的事。</p>
                  <div className="welcome-suggestions">
                    {SUGGESTIONS.map((s, i) => (
                      <button type="button" key={i} className="suggestion-chip" onClick={() => { setInputValue(s); inputRef.current?.focus(); }}>
                        <span>{s}</span><span className="suggestion-arrow" aria-hidden="true">↗</span>
                      </button>
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
                            情绪: {getEmotionLabel(msg.emotion.emotion)}
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
                  aria-label={activeNav === 'simulation' ? '你的对话回复' : '你的社交经历'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={getPlaceholder()}
                  disabled={isInputDisabled}
                />
                
                {activeNav === 'simulation' && selectedScenario && conversationId && (
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
                    aria-label={isRecording ? '停止录音' : '语音输入'}
                >
                  <IconMic />
                </button>
                <button
                  type="submit"
                  className="send-btn"
                  aria-label="发送消息"
                  disabled={!inputValue.trim() || isInputDisabled}
                >
                  <IconSend />
                </button>
              </form>
              <div className="input-disclaimer">
                {activeNav === 'simulation' 
                  ? (conversationId ? '按自己的节奏练习，需要帮助时可以点击“怎么办？”。' : '先试着回复一句，之后可以点击“怎么办？”获取建议。')
                  : SUPPORT_NOTICE}
              </div>
            </div>
          </div>
        )}
        {import.meta.env.VITE_ICP_RECORD && (
          <footer className="filing-footer">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">{import.meta.env.VITE_ICP_RECORD}</a>
          </footer>
        )}
      </main>

      {/* ---- REPORT MODAL ---- */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-label="本次练习回顾" onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconSparkles />
                本次练习回顾
              </div>
              {currentScore !== null && currentScore !== undefined && (
                <div style={{ background: 'var(--accent-glow)', color: 'var(--accent-bright)', padding: '4px 12px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                  本次练习 {currentScore} 分
                </div>
              )}
            </div>
            <div className="report-body markdown-body">
              {currentReport ? <ReactMarkdown>{currentReport}</ReactMarkdown> : '暂时没有可显示的回顾，可以继续聊几句后再试。'}
            </div>
            <div className="modal-actions">
              {!isExample && (activeNav === 'review' || activeNav === 'simulation') && <button className="btn secondary" onClick={() => {
                setShowReportModal(false);
                handleNewChat();
              }}>开始新对话</button>}
              <button className="btn primary" onClick={() => setShowReportModal(false)}>
                {activeNav === 'review' || activeNav === 'simulation' ? '继续对话' : '关闭回顾'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- DELETE CONFIRM MODAL ---- */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ color: 'var(--red)' }}>
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
              <button className="btn danger" onClick={confirmDelete}>
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
                  说说你正在担心什么，我们一起想一句适合当前情景的回复。
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
                    <strong>为什么可以这样说：</strong><br/>
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
            <div className="loading-text" role="status">正在整理本次练习</div>
            <div className="loading-subtitle">
              回看你的感受和想法<br />
              整理下一次可以尝试的小行动…
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

export default function ProfileApp() {
  const [profile, setProfile] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('example') === '1';
    return requested || localStorage.getItem('maybe-profile') === 'example' ? 'example' : 'personal';
  });
  const [initialNav, setInitialNav] = useState('review');
  const changeProfile = (nextProfile, nav = 'review') => {
    localStorage.setItem('maybe-profile', nextProfile);
    const url = new URL(window.location.href);
    url.searchParams.delete('example');
    window.history.replaceState(null, '', url);
    setInitialNav(nav);
    setProfile(nextProfile);
  };
  return <App key={profile} profile={profile} onProfileChange={changeProfile} initialNav={initialNav} />;
}
