'use client';

import UserProfile from './UserProfile';

export default function Sidebar({
  skills,
  activeSkill,
  onSelectSkill,
  onUseTool,
  onNewChat,
  sessions = [],
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  username,
  onUpdateUsername,
  onSwitchUser,
  isOpen = false,
  onClose,
}) {
  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">✦</div>
            <span className="logo-text">Agentheek</span>
          </div>
          <button
            type="button"
            className="new-chat-btn"
            onClick={() => {
              onNewChat?.();
              onClose?.();
            }}
            title="Start a new chat and save current conversation"
          >
            + New Chat
          </button>
        </div>

      {/* User Profile / In-Place Unique Username Section */}
      <UserProfile
        username={username}
        onUpdateUsername={onUpdateUsername}
        onSwitchUser={onSwitchUser}
      />

      <div className="sidebar-divider" style={{ margin: '8px 0 4px' }} />

      {/* Recent Chats Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Recent Chats</div>
        {sessions.length === 0 ? (
          <div className="empty-chats-hint">No saved chats yet</div>
        ) : (
          <div className="chat-sessions-list">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`chat-session-item ${
                  currentSessionId === s.id ? 'active' : ''
                }`}
                onClick={() => onSelectSession && onSelectSession(s.id)}
                title={s.title || 'Chat conversation'}
              >
                <span className="chat-session-icon">💬</span>
                <span className="chat-session-title">
                  {s.title || 'New Conversation'}
                </span>
                <button
                  type="button"
                  className="chat-session-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession && onDeleteSession(s.id);
                  }}
                  title="Delete chat"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-divider" />

      {/* Skills Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <div className="sidebar-section-title">Skills</div>
          {activeSkill ? (
            <button
              type="button"
              className="skill-clear-btn"
              onClick={() => onSelectSkill(null)}
              title="Return to auto-detect mode"
            >
              ✕ Clear
            </button>
          ) : (
            <div className="skill-auto-badge-pill" title="Model auto-selects relevant skill from your prompts">
              <span className="skill-auto-dot" />
              <span>Auto-detect</span>
            </div>
          )}
        </div>

        {skills.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              padding: '6px 0',
            }}
          >
            No skills loaded
          </div>
        ) : (
          <div className="skills-card-list">
            {skills.map((s) => {
              const isActive = activeSkill === s.name;
              return (
                <div
                  key={s.name}
                  className={`skill-card-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectSkill(isActive ? null : s.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSkill(isActive ? null : s.name);
                    }
                  }}
                  title={isActive ? `Click to deactivate /${s.name}` : `Click to lock /${s.name} skill`}
                >
                  <div className="skill-card-top">
                    <div className="skill-card-icon-wrap">
                      {s.name.includes('generator') ? (
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
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                          <path d="M12 2v4M12 18v4" />
                        </svg>
                      ) : s.name.includes('reviewer') ? (
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
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                      ) : (
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
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                      )}
                    </div>
                    <span className="skill-card-name">{s.displayName}</span>
                    {isActive ? (
                      <span className="skill-card-badge active">Locked</span>
                    ) : (
                      <span className="skill-card-badge">/{s.name}</span>
                    )}
                  </div>

                  {s.description && (
                    <div className="skill-card-desc">
                      {s.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-info">
        <p>
          Type{' '}
          <code
            style={{
              background: 'var(--bg-active)',
              padding: '1px 5px',
              borderRadius: 4,
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            /
          </code>{' '}
          in chat to browse and select available skills instantly.
        </p>
      </div>

      {/* Tools Section */}
      <div className="sidebar-section" style={{ marginTop: 8 }}>
        <div className="sidebar-section-title">Tools</div>
        <button
          type="button"
          className="skill-pill tool-pill"
          onClick={() => onUseTool && onUseTool('get_weather')}
          title="Click to check current weather in any city"
        >
          <span className="skill-pill-icon">🌤️</span>
          <span className="skill-pill-name">get_weather</span>
          <span className="skill-pill-slash">use tool ↗</span>
        </button>
      </div>

      <div className="sidebar-footer">Powered by Gemini 3.6 Flash</div>
    </aside>
    </>
  );
}
