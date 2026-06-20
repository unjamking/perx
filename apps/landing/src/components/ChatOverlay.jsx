import React, { useState, useEffect, useRef } from 'react';

export default function ChatOverlay({ active, onClose, lang, translations }) {
  const t = translations[lang];
  const chatBodyRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [promptsDisabled, setPromptsDisabled] = useState(false);

  const [prevActive, setPrevActive] = useState(active);
  const [prevLang, setPrevLang] = useState(lang);

  if (active !== prevActive || lang !== prevLang) {
    setPrevActive(active);
    setPrevLang(lang);
    if (active) {
      setMessages([
        { id: 1, text: t.chatBotWelcome, sender: 'bot' }
      ]);
      setTyping(false);
      setPromptsDisabled(false);
    }
  }

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, typing]);

  if (!active) return null;

  const handlePromptClick = (index, key) => {
    if (promptsDisabled) return;

    // Send user message
    const userText = t[key];
    const newMsgId = messages.length + 1;
    setMessages(prev => [...prev, { id: newMsgId, text: userText, sender: 'user' }]);
    setPromptsDisabled(true);
    setTyping(true);

    // Simulate response delay
    setTimeout(() => {
      setTyping(false);
      let respKey = 'chatBotResp1';
      if (index === 1) respKey = 'chatBotResp2';
      if (index === 2) respKey = 'chatBotResp3';

      setMessages(prev => [...prev, { id: prev.length + 1, text: t[respKey], sender: 'bot' }]);
      setPromptsDisabled(false);
    }, 1200);
  };

  const prompts = [
    { key: 'chatSuggestPrompt', index: 0 },
    { key: 'chatBllokuPrompt', index: 1 },
    { key: 'chatGymPrompt', index: 2 }
  ];

  return (
    <div className={`modal-overlay ${active ? 'active' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="chat-overlay-box">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-bot-profile">
            <div className="bot-avatar">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', color: '#013137' }}>
                <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2" />
              </svg>
            </div>
            <div>
              <div className="bot-name">Exodus AI</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Tirana Concierge
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="bot-status" title="Exodus is online"></div>
            <button 
              className="modal-close" 
              onClick={onClose} 
              style={{ position: 'relative', top: 'auto', right: 'auto', width: '30px', height: '30px', fontSize: '1.2rem' }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Message Logs */}
        <div className="chat-body" ref={chatBodyRef}>
          {messages.map((msg) => (
            <div 
              className={`chat-msg ${msg.sender}`} 
              key={msg.id}
              dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br>') }}
            />
          ))}

          {/* Typing Indicator */}
          {typing && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        {/* Prompts list */}
        <div className="chat-prompts">
          {prompts.map((p) => (
            <button 
              key={p.key}
              className="chat-prompt-btn"
              disabled={promptsDisabled}
              onClick={() => handlePromptClick(p.index, p.key)}
              style={{ opacity: promptsDisabled ? 0.5 : 1, pointerEvents: promptsDisabled ? 'none' : 'auto' }}
            >
              {t[p.key]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
