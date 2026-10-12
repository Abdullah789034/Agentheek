'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WeatherCard from './WeatherCard';

function CodeBlock({ language, code, children }) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  };

  const cleanLang = (language || '').toLowerCase().trim();
  const isHtml = cleanLang === 'html' || cleanLang === 'htm';
  const displayLang = cleanLang ? cleanLang.toUpperCase() : 'CODE';

  return (
    <div className="code-block-card">
      <div className="code-block-header">
        <div className="code-block-lang">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span>{displayLang}</span>
        </div>

        <div className="code-block-actions">
          {isHtml && (
            <button
              type="button"
              className={`code-preview-toggle ${showPreview ? 'active' : ''}`}
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? 'Switch to code view' : 'Preview rendered HTML'}
            >
              {showPreview ? (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span>Code</span>
                </>
              ) : (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>Live Preview</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            className="code-copy-btn"
            onClick={handleCopy}
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ color: '#10b981' }}>Copied!</span>
              </>
            ) : (
              <>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isHtml && showPreview ? (
        <div className="code-preview-pane">
          <iframe
            srcDoc={code}
            sandbox="allow-scripts"
            className="code-preview-iframe"
            title="HTML Live Preview"
          />
        </div>
      ) : (
        <pre className="code-block-pre">
          <code className={language ? `language-${language}` : ''}>
            {children}
          </code>
        </pre>
      )}
    </div>
  );
}

export default function MessageBubble({ msg, isStreaming }) {
  if (msg.role === 'user') {
    return (
      <div className="message user">
        <div className="message-avatar" aria-label="User">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="message-bubble">
          {msg.imagePreview && (
            <div className="message-image-preview">
              <img src={msg.imagePreview} alt="Attached" />
            </div>
          )}
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.role === 'skill_banner') {
    return (
      <div className={`skill-banner ${msg.autoDetected ? 'auto-detected' : ''}`}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0-3 3.86V12a4 4 0 0 0 2 3.46V16a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4v-.54A4 4 0 0 0 19 12v-1.14A4 4 0 0 0 16 7V6a4 4 0 0 0-4-4z" />
        </svg>
        <span>
          Skill active: <strong>{msg.displayName || msg.skill}</strong>
        </span>
        {msg.autoDetected && (
          <span className="skill-auto-badge">Auto-routed</span>
        )}
      </div>
    );
  }

  if (msg.role === 'tool_event') {
    const formattedArgs = Object.entries(msg.args || {})
      .map(([k, v]) => `${k}: "${v}"`)
      .join(', ');

    return (
      <div className="tool-event">
        <div className="tool-call-card">
          <div className="tool-call-header-row">
            <div className="tool-call-left">
              <span className="tool-call-icon">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              <div>
                <div className="tool-call-label">Autonomous Tool</div>
                <div className="tool-call-name">
                  {msg.name}(<span className="tool-call-arg">{formattedArgs}</span>)
                </div>
              </div>
            </div>
            <div className="tool-call-right">
              {msg.status === 'calling' && (
                <div className="tool-calling-badge">
                  <div className="thinking-indicator">
                    <div className="thinking-dot" />
                    <div className="thinking-dot" />
                    <div className="thinking-dot" />
                  </div>
                  <span>Fetching live data…</span>
                </div>
              )}
              {msg.status === 'done' && (
                <div className="tool-done-badge">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{msg.result?.durationMs ? `${msg.result.durationMs}ms` : 'Executed'}</span>
                </div>
              )}
              {msg.status === 'error' && (
                <span className="tool-error-badge">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  Failed
                </span>
              )}
            </div>
          </div>
        </div>
        {msg.result && <WeatherCard result={msg.result} />}
        {msg.error && (
          <div className="error-card">
            <span className="error-card-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span>{msg.error}</span>
          </div>
        )}
      </div>
    );
  }

  if (msg.role === 'error') {
    return (
      <div className="message-error-group" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msg.content ? (
          <div className="message assistant" style={{ marginBottom: 2 }}>
            <div className="message-avatar">✦</div>
            <div className="message-bubble">
              <div className="md-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre({ children }) {
                      return <div className="code-container-wrapper">{children}</div>;
                    },
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      const isBlock = match || codeString.includes('\n');

                      if (!inline && isBlock) {
                        return (
                          <CodeBlock language={match ? match[1] : ''} code={codeString}>
                            {children}
                          </CodeBlock>
                        );
                      }

                      return (
                        <code className="inline-code" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ) : null}

        <div className="error-card">
          <span className="error-card-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <div>
            {msg.code && (
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 2,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {msg.code.replace(/_/g, ' ')}
              </div>
            )}
            {msg.message}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="message assistant">
      <div className="message-avatar">✦</div>
      <div className="message-bubble">
        {msg.content ? (
          <div className="md-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre({ children }) {
                  return <div className="code-container-wrapper">{children}</div>;
                },
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const isBlock = match || codeString.includes('\n');

                  if (!inline && isBlock) {
                    return (
                      <CodeBlock
                        language={match ? match[1] : ''}
                        code={codeString}
                      >
                        {children}
                      </CodeBlock>
                    );
                  }

                  return (
                    <code className="inline-code" {...props}>
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="table-responsive-wrapper">
                      <table className="md-table">{children}</table>
                    </div>
                  );
                },
                a({ href, children, ...props }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="md-link"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        ) : null}
        {isStreaming && !msg.content && (
          <div className="thinking-indicator">
            <div className="thinking-dot" />
            <div className="thinking-dot" />
            <div className="thinking-dot" />
          </div>
        )}
        {isStreaming && msg.content && <span className="streaming-cursor" />}
      </div>
    </div>
  );
}
