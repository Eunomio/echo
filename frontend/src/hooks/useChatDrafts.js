import { useCallback, useRef, useState } from 'react';

export const emptyChatDraft = () => ({
  messages: [], inputValue: '', conversationId: null,
  selectedScenario: null, pendingScenario: null, customOptions: {},
  title: '', fromHistory: false,
});

// Keep each practice intact while the user visits another page or practice.
export function useChatDrafts(initialType = 'review') {
  const [chatType, setChatType] = useState(initialType);
  const [drafts, setDrafts] = useState(() => ({ review: emptyChatDraft(), simulation: emptyChatDraft() }));
  const speechTarget = useRef(initialType);
  const selectChatType = type => {
    setChatType(type);
  };
  const markSpeechTarget = () => { speechTarget.current = chatType; };
  const setField = field => value => {
    setDrafts(previous => ({
      ...previous,
      [chatType]: { ...previous[chatType], [field]: typeof value === 'function' ? value(previous[chatType][field]) : value },
    }));
  };
  const replaceDraft = (type, draft) => {
    setDrafts(previous => ({ ...previous, [type]: { ...emptyChatDraft(), ...draft } }));
    selectChatType(type);
  };
  const appendSpeech = useCallback(text => {
    const type = speechTarget.current;
    setDrafts(previous => ({ ...previous, [type]: { ...previous[type], inputValue: previous[type].inputValue + text } }));
  }, []);
  return {
    ...drafts[chatType], chatType, selectChatType, replaceDraft, appendSpeech, markSpeechTarget,
    setMessages: setField('messages'), setInputValue: setField('inputValue'),
    setConversationId: setField('conversationId'), setSelectedScenario: setField('selectedScenario'),
    setPendingScenario: setField('pendingScenario'), setCustomOptions: setField('customOptions'),
  };
}
