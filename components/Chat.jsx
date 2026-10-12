'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import ChatComposer from './ChatComposer';

const STORAGE_SESSIONS_KEY = 'agentheek_saved_sessions';
const STORAGE_CURRENT_ID_KEY = 'agentheek_current_session_id';
const STORAGE_USER_KEY = 'agentheek_username';

// ─── Skill slash-command detection helper ─────────────────────────────────────
function detectSkillFromText(text, availableSkills) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return { skill: null, cleanText: text };

  // Find longest matching skill slug
  for (const s of availableSkills) {
    const slash = `/${s.name}`;
    if (trimmed.toLowerCase().startsWith(slash.toLowerCase())) {
      const rest = trimmed.slice(slash.length).trim();
      return { skill: s.name, cleanText: rest };
    }
  }
  return { skill: null, cleanText: text };
}

const DEFAULT_SKILLS = [
  {
    name: 'code-generator',
    displayName: 'Code Generator Skill',
    description: 'Senior software architect producing complete, runnable, production-grade code',
  },
  {
    name: 'code-reviewer',
    displayName: 'Code Reviewer Skill',
    description: 'Senior software engineer conducting thorough code reviews',
  },
  {
    name: 'lesson-planner',
    displayName: 'Lesson Planner Skill',
    description: 'Expert educational lesson planner creating structured lesson plans',
  },
];

// ─── Main Chat Component ─────────────────────────────────────────────────────
export default function Chat() {
  const [username, setUsername] = useState('');
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]); // rendered timeline of current session
  const [history, setHistory] = useState([]);   // {role, content} for API multi-turn context
  const [isGenerating, setIsGenerating] = useState(false);
  const [skills, setSkills] = useState(DEFAULT_SKILLS);
  const [activeSkill, setActiveSkill] = useState(null);
  const [prefilledText, setPrefilledText] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Helper to persist a chat session to MongoDB
  const persistSessionToMongo = useCallback(
    async (sessionData, userTarget = username) => {
      const u = (userTarget || '').trim();
      if (!u || !sessionData || !sessionData.id) return;
      try {
        await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: u,
            session: sessionData,
          }),
        });
      } catch (e) {
        console.warn('Failed to persist session to MongoDB:', e);
      }
    },
    [username]
  );

  // Initialize Auth & restore sessions from MongoDB on mount
  useEffect(() => {
    async function initAuthAndChats() {
      let savedUser = '';
      try {
        savedUser = localStorage.getItem(STORAGE_USER_KEY) || '';
      } catch (e) {}

      if (!savedUser) {
        savedUser = 'user_' + Math.floor(1000 + Math.random() * 9000);
        try {
          localStorage.setItem(STORAGE_USER_KEY, savedUser);
        } catch (e) {}
      }

      setUsername(savedUser);

      // Register or verify in MongoDB
      try {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: savedUser }),
        });

        // Load chats corresponding to this unique username
        const res = await fetch(`/api/chats?username=${encodeURIComponent(savedUser)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.chats) && data.chats.length > 0) {
          setSessions(data.chats);
          const savedActiveId = localStorage.getItem(STORAGE_CURRENT_ID_KEY);
          const active =
            data.chats.find((s) => s.id === savedActiveId) || data.chats[0];
          setCurrentSessionId(active.id);
          setMessages(active.messages || []);
          setHistory(active.history || []);
          setActiveSkill(active.activeSkill || null);
          setIsHydrated(true);
          return;
        }
      } catch (err) {
        console.warn('MongoDB init or fetch chats error:', err);
      }

      // If no existing chats in MongoDB for this user, start a fresh session
      const initialId = 'chat-' + Date.now();
      setCurrentSessionId(initialId);
      setSessions([]);
      setMessages([]);
      setHistory([]);
      setIsHydrated(true);
    }

    initAuthAndChats();
  }, []);

  // Sync current conversation changes into the active session state
  useEffect(() => {
    if (!isHydrated || !currentSessionId) return;
    if (messages.length === 0) return;

    setSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === currentSessionId);
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const titleCandidate = firstUserMsg
        ? firstUserMsg.content.slice(0, 30).trim() +
          (firstUserMsg.content.length > 30 ? '…' : '')
        : 'Chat conversation';

      const updatedSession = {
        id: currentSessionId,
        username,
        title:
          existingIdx >= 0 && prev[existingIdx].title
            ? prev[existingIdx].title
            : titleCandidate,
        messages,
        history,
        activeSkill,
        updatedAt: Date.now(),
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updatedSession;
        return copy;
      } else {
        return [updatedSession, ...prev];
      }
    });
  }, [messages, history, activeSkill, currentSessionId, isHydrated, username]);

  // Debounced auto-save active session to MongoDB
  useEffect(() => {
    if (!isHydrated || !username || !currentSessionId || messages.length === 0) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const current = sessions.find((s) => s.id === currentSessionId);
      if (current) {
        persistSessionToMongo(current, username);
      }
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [sessions, currentSessionId, username, isHydrated, messages.length, persistSessionToMongo]);

  // Persist current session ID to localStorage for quick restore
  useEffect(() => {
    if (!isHydrated || !currentSessionId) return;
    try {
      localStorage.setItem(STORAGE_CURRENT_ID_KEY, currentSessionId);
    } catch (e) {}
  }, [currentSessionId, isHydrated]);

  // In-place edit/rename unique username (updates MongoDB user & all corresponding chats)
  const handleUpdateUsername = useCallback(
    async (newUsername) => {
      if (!username) return { success: false, error: 'No active user' };
      try {
        const res = await fetch('/api/auth', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldUsername: username, newUsername }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Failed to update username' };
        }

        setUsername(newUsername);
        try {
          localStorage.setItem(STORAGE_USER_KEY, newUsername);
        } catch (e) {}

        // Update sessions in memory to reflect new username
        setSessions((prev) =>
          prev.map((s) => ({ ...s, username: newUsername }))
        );

        return { success: true };
      } catch (err) {
        return { success: false, error: err.message || 'Network error' };
      }
    },
    [username]
  );

  // Switch to another username in-place and load all chats corresponding to it
  const handleSwitchUser = useCallback(
    async (targetUsername) => {
      try {
        const authRes = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: targetUsername }),
        });
        const authData = await authRes.json();
        if (!authRes.ok || !authData.success) {
          return { success: false, error: authData.error || 'Failed to authenticate user' };
        }

        setUsername(targetUsername);
        try {
          localStorage.setItem(STORAGE_USER_KEY, targetUsername);
        } catch (e) {}

        // Fetch chats for the target user from MongoDB
        const chatsRes = await fetch(`/api/chats?username=${encodeURIComponent(targetUsername)}`);
        const chatsData = await chatsRes.json();
        if (chatsData.success && Array.isArray(chatsData.chats) && chatsData.chats.length > 0) {
          setSessions(chatsData.chats);
          const active = chatsData.chats[0];
          setCurrentSessionId(active.id);
          setMessages(active.messages || []);
          setHistory(active.history || []);
          setActiveSkill(active.activeSkill || null);
        } else {
          const newId = 'chat-' + Date.now();
          setCurrentSessionId(newId);
          setSessions([]);
          setMessages([]);
          setHistory([]);
          setActiveSkill(null);
        }

        return { success: true };
      } catch (err) {
        return { success: false, error: err.message || 'Network error' };
      }
    },
    []
  );

  // Load available skills on mount
  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.skills) && d.skills.length > 0) {
          setSkills(d.skills);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }, []);

  const updateLastAssistant = useCallback((updater) => {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'assistant') {
          next[i] = { ...next[i], ...updater(next[i]) };
          break;
        }
      }
      return next;
    });
  }, []);

  const updateLastToolEvent = useCallback((name, updater) => {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'tool_event' && next[i].name === name) {
          next[i] = { ...next[i], ...updater(next[i]) };
          break;
        }
      }
      return next;
    });
  }, []);

  // Start a new chat session and keep previous in sidebar & MongoDB
  const handleNewChat = useCallback(() => {
    if (isGenerating) return;

    // Immediately save current session before starting new one if it has messages
    if (username && currentSessionId && messages.length > 0) {
      const current = sessions.find((s) => s.id === currentSessionId);
      if (current) {
        persistSessionToMongo(current, username);
      }
    }

    const newId = 'chat-' + Date.now();
    setCurrentSessionId(newId);
    setMessages([]);
    setHistory([]);
    setActiveSkill(null);
    setPrefilledText({ text: '', timestamp: Date.now() });
    setIsMobileSidebarOpen(false);
  }, [isGenerating, username, currentSessionId, messages.length, sessions, persistSessionToMongo]);

  // Restore a previous chat session when clicked in the sidebar
  const handleSelectSession = useCallback(
    (sessionId) => {
      if (sessionId === currentSessionId) return;
      if (isGenerating) return;

      const target = sessions.find((s) => s.id === sessionId);
      if (!target) return;

      setCurrentSessionId(target.id);
      setMessages(target.messages || []);
      setHistory(target.history || []);
      setActiveSkill(target.activeSkill || null);
      setIsMobileSidebarOpen(false);
    },
    [currentSessionId, isGenerating, sessions]
  );

  // Delete a chat session from sidebar & MongoDB
  const handleDeleteSession = useCallback(
    (sessionId) => {
      if (username) {
        fetch(`/api/chats?username=${encodeURIComponent(username)}&id=${encodeURIComponent(sessionId)}`, {
          method: 'DELETE',
        }).catch(console.warn);
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      if (sessionId === currentSessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          const next = remaining[0];
          setCurrentSessionId(next.id);
          setMessages(next.messages || []);
          setHistory(next.history || []);
          setActiveSkill(next.activeSkill || null);
        } else {
          const newId = 'chat-' + Date.now();
          setCurrentSessionId(newId);
          setMessages([]);
          setHistory([]);
          setActiveSkill(null);
        }
      }
    },
    [currentSessionId, sessions, username]
  );

  // Handler to use tool from sidebar (e.g. get_weather)
  const handleUseTool = useCallback((toolName) => {
    if (toolName === 'get_weather') {
      setPrefilledText({
        text: "What's the weather in London?",
        timestamp: Date.now(),
      });
    }
  }, []);

  const handleSend = useCallback(
    async ({ text, image }) => {
      if (isGenerating) return;

      // Detect skill from slash command OR use sidebar-selected skill
      let skillToUse = activeSkill;
      let cleanText = text;

      const detected = detectSkillFromText(text, skills);
      if (detected.skill) {
        skillToUse = detected.skill;
        cleanText = detected.cleanText;
      }

      if (!cleanText && !image) return;

      const userContent = cleanText || '[Image attached]';

      // Add user message to UI
      addMessage({
        role: 'user',
        content: cleanText,
        imagePreview: image?.preview || null,
      });

      // Add placeholder assistant message
      addMessage({ role: 'assistant', content: '' });

      setIsGenerating(true);

      // Multi-turn history preserves previous turns for earlier context
      const newHistory = [
        ...history,
        { role: 'user', content: userContent },
      ];

      try {
        const formData = new FormData();
        formData.append('messages', JSON.stringify(newHistory));
        if (skillToUse) formData.append('skill', skillToUse);
        if (image?.file) formData.append('image', image.file);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const response = await fetch('/api/chat', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown error');
          let errMsg = `Server error (${response.status})`;
          if (response.status === 429) {
            errMsg = 'Rate limited. Please wait a moment and try again.';
          } else if (response.status === 500) {
            errMsg = `Server error: ${errText}`;
          }
          updateLastAssistant(() => ({
            role: 'error',
            message: errMsg,
            code: `HTTP_${response.status}`,
            content: '',
          }));
          setIsGenerating(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullAssistantText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let eventType = null;

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (!dataStr || !eventType) continue;

              let data;
              try {
                data = JSON.parse(dataStr);
              } catch {
                continue;
              }

              switch (eventType) {
                case 'token':
                  fullAssistantText += data.text;
                  updateLastAssistant(() => ({ content: fullAssistantText }));
                  break;

                case 'skill_active': {
                  const skillName = data.skill;
                  const skillDisplay =
                    data.displayName ||
                    skills.find((s) => s.name === data.skill)?.displayName ||
                    data.skill;

                  setMessages((prev) => {
                    const idx = [...prev]
                      .reverse()
                      .findIndex((m) => m.role === 'assistant');
                    if (idx === -1) return prev;
                    const insertAt = prev.length - 1 - idx;
                    const next = [...prev];
                    next.splice(insertAt, 0, {
                      id: Date.now() + Math.random(),
                      role: 'skill_banner',
                      skill: skillName,
                      displayName: skillDisplay,
                      autoDetected: Boolean(data.autoDetected),
                    });
                    return next;
                  });
                  break;
                }

                case 'tool_call':
                  setMessages((prev) => {
                    const idx = [...prev]
                      .reverse()
                      .findIndex((m) => m.role === 'assistant');
                    if (idx === -1) return prev;
                    const insertAt = prev.length - 1 - idx;
                    const next = [...prev];
                    next.splice(insertAt, 0, {
                      id: Date.now() + Math.random(),
                      role: 'tool_event',
                      name: data.name,
                      args: data.args,
                      status: 'calling',
                      result: null,
                    });
                    return next;
                  });
                  break;

                case 'tool_result':
                  updateLastToolEvent(data.name, () => ({
                    status: 'done',
                    result: data.result,
                  }));
                  break;

                case 'tool_error':
                  updateLastToolEvent(data.name, () => ({
                    status: 'error',
                    error: data.message,
                  }));
                  break;

                case 'warning':
                  console.warn('API warning:', data.message);
                  break;

                case 'error':
                  updateLastAssistant((prev) => ({
                    role: 'error',
                    message: data.message,
                    code: data.code,
                    content: prev?.content || data.partialContent || fullAssistantText || '',
                  }));
                  break;

                case 'done':
                  setHistory((prev) => [
                    ...prev,
                    { role: 'user', content: userContent },
                    { role: 'assistant', content: fullAssistantText },
                  ]);
                  break;
              }

              eventType = null;
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          setMessages((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].role === 'assistant') {
                next[i] = {
                  ...next[i],
                  content:
                    (next[i].content || '') +
                    '\n\n_[Generation stopped by user]_',
                };
                break;
              }
            }
            return next;
          });
        } else {
          updateLastAssistant((prev) => ({
            role: 'error',
            message: `Connection error: ${err.message}`,
            code: 'CONNECTION_ERROR',
            content: prev?.content || fullAssistantText || '',
          }));
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [
      isGenerating,
      history,
      skills,
      activeSkill,
      addMessage,
      updateLastAssistant,
      updateLastToolEvent,
    ]
  );

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleExamplePrompt = (prompt) => {
    handleSend({ text: prompt, image: null });
  };

  return (
    <div className="app-layout">
      <Sidebar
        skills={skills}
        activeSkill={activeSkill}
        onSelectSkill={(skill) => {
          setActiveSkill(skill);
          setIsMobileSidebarOpen(false);
        }}
        onUseTool={(toolPrompt) => {
          handleUseTool(toolPrompt);
          setIsMobileSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        username={username}
        onUpdateUsername={handleUpdateUsername}
        onSwitchUser={handleSwitchUser}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className="main-area">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              title="Toggle sidebar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className={`status-dot ${isGenerating ? 'thinking' : ''}`} />
            <div>
              <div className="chat-header-title">Agentheek</div>
              <div className="chat-header-subtitle">
                {isGenerating ? 'Generating…' : username ? `Signed in as @${username}` : 'Ready'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeSkill && (
              <div className="active-skill-badge">
                🧠{' '}
                {skills.find((s) => s.name === activeSkill)?.displayName ||
                  activeSkill}
              </div>
            )}
          </div>
        </header>

        {/* Generating progress bar */}
        {isGenerating && <div className="generating-bar" />}

        {/* Messages */}
        <MessageList
          messages={messages}
          isGenerating={isGenerating}
          onExamplePrompt={handleExamplePrompt}
          messagesEndRef={messagesEndRef}
        />

        {/* Composer */}
        <ChatComposer
          onSend={handleSend}
          isGenerating={isGenerating}
          onStop={handleStop}
          skills={skills}
          activeSkill={activeSkill}
          onSkillChange={setActiveSkill}
          prefilledText={prefilledText}
        />
      </div>
    </div>
  );
}
