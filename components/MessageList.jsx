'use client';

import MessageBubble from './MessageBubble';

const EXAMPLE_PROMPTS = [
  "What's the weather in Tokyo?",
  "What's the weather in London?",
  "Explain quantum entanglement simply",
  "Write a haiku about autumn",
];

export default function MessageList({
  messages,
  isGenerating,
  onExamplePrompt,
  messagesEndRef,
}) {
  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">✦</div>
        <h1 className="empty-state-title">Welcome to Agentheek</h1>
        <p className="empty-state-desc">
          Ask anything, attach an image, ask about the weather in any city, or activate a skill with <kbd>/</kbd>.
        </p>
        <div className="empty-state-chips">
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              className="chip"
              onClick={() => onExamplePrompt && onExamplePrompt(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="message-list" id="message-list">
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id || i}
          msg={msg}
          isStreaming={
            isGenerating &&
            i === messages.length - 1 &&
            msg.role === 'assistant'
          }
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
