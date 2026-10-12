'use client';

import { useState, useRef, useEffect } from 'react';

export default function UserProfile({
  username,
  onUpdateUsername,
  onSwitchUser,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(username || '');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchValue, setSwitchValue] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const editInputRef = useRef(null);
  const switchInputRef = useRef(null);

  useEffect(() => {
    setEditValue(username || '');
  }, [username]);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isSwitching && switchInputRef.current) {
      switchInputRef.current.focus();
    }
  }, [isSwitching]);

  const handleStartEdit = () => {
    setError(null);
    setSuccessMsg(null);
    setEditValue(username || '');
    setIsEditing(true);
    setIsSwitching(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
    setEditValue(username || '');
  };

  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    const trimmed = editValue.trim();
    if (!trimmed) {
      setError('Username cannot be empty');
      return;
    }
    if (trimmed === username) {
      setIsEditing(false);
      return;
    }
    if (!/^[a-zA-Z0-9_-]{2,30}$/.test(trimmed)) {
      setError('2-30 characters (letters, numbers, _ or -)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await onUpdateUsername(trimmed);
      if (res?.success) {
        setIsEditing(false);
        setSuccessMsg('Username updated!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res?.error || 'Failed to update username');
      }
    } catch (err) {
      setError(err?.message || 'Error updating username');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSwitch = () => {
    setError(null);
    setSuccessMsg(null);
    setSwitchValue('');
    setIsSwitching(true);
    setIsEditing(false);
  };

  const handleCancelSwitch = () => {
    setIsSwitching(false);
    setError(null);
    setSwitchValue('');
  };

  const handleSaveSwitch = async (e) => {
    e?.preventDefault();
    const trimmed = switchValue.trim();
    if (!trimmed) {
      setError('Enter a username');
      return;
    }
    if (!/^[a-zA-Z0-9_-]{2,30}$/.test(trimmed)) {
      setError('2-30 characters (letters, numbers, _ or -)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await onSwitchUser(trimmed);
      if (res?.success) {
        setIsSwitching(false);
        setSuccessMsg(`Switched to @${trimmed}`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res?.error || 'Failed to switch user');
      }
    } catch (err) {
      setError(err?.message || 'Error switching user');
    } finally {
      setIsLoading(false);
    }
  };

  // If no username is set yet
  if (!username && !isSwitching) {
    return (
      <div className="sidebar-user-card">
        <form onSubmit={handleSaveSwitch} className="user-edit-box">
          <div className="user-edit-label">
            <span>👤 Enter Unique Username</span>
          </div>
          <div className="user-edit-input-wrapper">
            <input
              type="text"
              className="user-edit-input"
              placeholder="e.g. alex"
              value={switchValue}
              onChange={(e) => setSwitchValue(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              className="user-edit-btn-save"
              disabled={isLoading || !switchValue.trim()}
            >
              {isLoading ? '...' : 'Continue'}
            </button>
          </div>
          {error && <div className="user-error-msg">⚠ {error}</div>}
        </form>
      </div>
    );
  }

  // Editing username mode
  if (isEditing) {
    return (
      <div className="sidebar-user-card">
        <form onSubmit={handleSaveEdit} className="user-edit-box">
          <div className="user-edit-label">
            <span>✏️ Edit Unique Username</span>
          </div>
          <div className="user-edit-input-wrapper">
            <input
              ref={editInputRef}
              type="text"
              className="user-edit-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <button
              type="submit"
              className="user-edit-btn-save"
              disabled={isLoading || !editValue.trim() || editValue.trim() === username}
            >
              {isLoading ? '...' : 'Save'}
            </button>
            <button
              type="button"
              className="user-edit-btn-cancel"
              onClick={handleCancelEdit}
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
          {error && <div className="user-error-msg">⚠ {error}</div>}
        </form>
      </div>
    );
  }

  // Switching user mode
  if (isSwitching) {
    return (
      <div className="sidebar-user-card">
        <form onSubmit={handleSaveSwitch} className="user-edit-box">
          <div className="user-edit-label">
            <span>⇄ Switch Username</span>
          </div>
          <div className="user-edit-input-wrapper">
            <input
              ref={switchInputRef}
              type="text"
              className="user-edit-input"
              placeholder="e.g. maria"
              value={switchValue}
              onChange={(e) => setSwitchValue(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancelSwitch();
              }}
            />
            <button
              type="submit"
              className="user-edit-btn-save"
              disabled={isLoading || !switchValue.trim()}
            >
              {isLoading ? '...' : 'Switch'}
            </button>
            <button
              type="button"
              className="user-edit-btn-cancel"
              onClick={handleCancelSwitch}
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
          {error && <div className="user-error-msg">⚠ {error}</div>}
        </form>
      </div>
    );
  }

  // Normal display mode
  const initial = (username?.[0] || 'U').toUpperCase();

  return (
    <div className="sidebar-user-card">
      <div className="user-display-row">
        <div className="user-avatar" title={`Logged in as @${username}`}>
          {initial}
        </div>
        <div className="user-meta">
          <div className="user-name-title" title={`@${username}`}>
            @{username}
          </div>
          <div className="user-tag">
            <span className="user-db-dot" />
            <span>Synced</span>
          </div>
        </div>
        <div className="user-actions">
          <button
            type="button"
            className="user-action-btn"
            onClick={handleStartEdit}
            title="Edit this unique username in-place"
            aria-label="Edit username"
          >
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
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            Edit
          </button>
          <button
            type="button"
            className="user-action-btn"
            onClick={handleStartSwitch}
            title="Switch to another username"
            aria-label="Switch to another username"
          >
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
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        </div>
      </div>
      {successMsg && <div className="user-success-msg" style={{ marginTop: 6 }}>✓ {successMsg}</div>}
      {error && <div className="user-error-msg" style={{ marginTop: 6 }}>⚠ {error}</div>}
    </div>
  );
}
