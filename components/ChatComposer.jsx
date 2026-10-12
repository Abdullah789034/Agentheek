'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import SkillsMenu from './SkillsMenu';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const FALLBACK_SKILLS = [
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

export default function ChatComposer({
  onSend,
  isGenerating,
  onStop,
  skills = [],
  activeSkill,
  onSkillChange,
  prefilledText,
}) {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null); // { file, preview, name, size, type }
  const [showSkillsMenu, setShowSkillsMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [composerError, setComposerError] = useState(null);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const composerContainerRef = useRef(null);

  const availableSkills = skills.length > 0 ? skills : FALLBACK_SKILLS;

  // Handle prefilled text (e.g. from clicking weather tool in sidebar)
  useEffect(() => {
    if (prefilledText) {
      const val =
        typeof prefilledText === 'object' ? prefilledText.text : prefilledText;
      if (val) {
        setText(val);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            const len = val.length;
            textareaRef.current.setSelectionRange(len, len);
          }
        }, 30);
      }
    }
  }, [prefilledText]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  // Compute filtered skills for keyboard navigation & selection
  const cleanQuery = (slashQuery || '').toLowerCase().trim();
  const filteredSkills = availableSkills.filter((s) => {
    if (!cleanQuery) return true;
    const nameMatch = s.name.toLowerCase().includes(cleanQuery);
    const displayMatch =
      s.displayName && s.displayName.toLowerCase().includes(cleanQuery);
    const descMatch =
      s.description && s.description.toLowerCase().includes(cleanQuery);
    return nameMatch || displayMatch || descMatch;
  });

  // Detect slash trigger whenever text changes
  const checkSlashTrigger = useCallback((currentText) => {
    // Matches a slash at start of line or preceded by whitespace, followed by letters
    const match = currentText.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
    if (match) {
      setSlashQuery(match[1] || '');
      setSelectedIndex(0);
      setShowSkillsMenu(true);
    } else {
      setShowSkillsMenu(false);
      setSlashQuery('');
    }
  }, []);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    checkSlashTrigger(val);
  };

  const selectSkill = useCallback(
    (skill) => {
      onSkillChange(skill.name);

      // Replace the trailing /query in the text with `/${skill.name} `
      let updatedText = text.replace(
        /(?:^|\s)\/([a-zA-Z0-9_-]*)$/,
        (matched) => {
          const prefix = matched.startsWith(' ') ? ' ' : '';
          return `${prefix}/${skill.name} `;
        }
      );

      // If text was empty or didn't replace cleanly, set default format
      if (!updatedText.includes(`/${skill.name}`)) {
        updatedText = `/${skill.name} `;
      }

      setText(updatedText);
      setShowSkillsMenu(false);
      setSlashQuery('');

      // Refocus textarea and place cursor at end
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = updatedText.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 20);
    },
    [text, onSkillChange]
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        composerContainerRef.current &&
        !composerContainerRef.current.contains(e.target)
      ) {
        setShowSkillsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    // If skills dropdown is visible, handle navigation keys
    if (showSkillsMenu && filteredSkills.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredSkills.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + filteredSkills.length) % filteredSkills.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredSkills[selectedIndex];
        if (selected) {
          selectSkill(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSkillsMenu(false);
        return;
      }
    }

    // Normal Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setComposerError('Invalid file type: please select JPEG, PNG, GIF, or WebP.');
      setTimeout(() => setComposerError(null), 4000);
      e.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setComposerError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`);
      setTimeout(() => setComposerError(null), 4000);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage({
        file,
        preview: ev.target.result,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeImage = () => setImage(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !image) return;
    if (isGenerating) return;

    setShowSkillsMenu(false);
    onSend({ text: trimmed, image });
    setText('');
    setImage(null);
  };

  const canSend = (text.trim() || image) && !isGenerating;

  return (
    <div className="composer-wrapper" ref={composerContainerRef}>
      <div className="composer-inner">
        {/* Skill quick-select chips */}
        {availableSkills.length > 0 && (
          <div className="composer-skill-row">
            <span className="composer-skill-label">Skill:</span>
            {availableSkills.map((s) => (
              <button
                key={s.name}
                type="button"
                className={`composer-skill-chip ${
                  activeSkill === s.name ? 'selected' : ''
                }`}
                onClick={() =>
                  onSkillChange(activeSkill === s.name ? null : s.name)
                }
              >
                🧠 {s.displayName}
              </button>
            ))}
            {activeSkill && (
              <button
                type="button"
                className="composer-skill-chip"
                onClick={() => onSkillChange(null)}
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                ✕ Clear
              </button>
            )}

            {/* Gemini-style autonomous tool indicator */}
            <div
              className="composer-tool-badge"
              title="Autonomous Tool: Gemini decides when to execute get_weather based on context"
            >
              <span className="tool-pulse-dot" />
              <span>Tool: <strong>get_weather</strong> (auto)</span>
            </div>
          </div>
        )}

        {/* Image preview */}
        {image && (
          <div className="image-preview-area">
            <img
              className="image-preview-thumb"
              src={image.preview}
              alt="Preview"
            />
            <div className="image-preview-info">
              <div className="image-preview-name">{image.name}</div>
              <div className="image-preview-size">
                {(image.size / 1024).toFixed(0)} KB
              </div>
            </div>
            <button
              type="button"
              className="image-preview-remove"
              onClick={removeImage}
              title="Remove image"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input container with relative positioning for autocomplete dropdown */}
        <div style={{ position: 'relative', width: '100%' }}>
          {composerError && (
            <div className="composer-error-banner" role="alert">
              <span>⚠️</span>
              <span>{composerError}</span>
            </div>
          )}

          {/* Slash Command Autocomplete Dropdown */}
          {showSkillsMenu && (
            <SkillsMenu
              skills={availableSkills}
              query={slashQuery}
              selectedIndex={selectedIndex}
              onSelect={selectSkill}
            />
          )}

          <div className="composer-input-row">
            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder={
                activeSkill
                  ? `Using /${activeSkill} skill — type your message…`
                  : 'Message Agentheek… (type / for skills, Shift+Enter for newline)'
              }
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isGenerating}
              id="chat-input"
            />

            <div className="composer-actions">
              {/* Image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
                id="image-upload"
              />
              <button
                type="button"
                className={`icon-btn ${image ? 'has-image' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                title="Attach image (JPEG, PNG, GIF, WebP up to 5MB)"
                aria-label="Attach image"
                disabled={isGenerating}
                id="attach-image-btn"
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
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>

              {/* Stop / Send */}
              {isGenerating ? (
                <button
                  type="button"
                  className="stop-btn"
                  onClick={onStop}
                  title="Stop generation"
                  aria-label="Stop generation"
                  id="stop-btn"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  className="send-btn"
                  onClick={handleSend}
                  disabled={!canSend}
                  title="Send message (Enter)"
                  aria-label="Send message"
                  id="send-btn"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="composer-hint">
          <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for newline · Type{' '}
          <kbd>/</kbd> to choose a skill
        </div>
      </div>
    </div>
  );
}
