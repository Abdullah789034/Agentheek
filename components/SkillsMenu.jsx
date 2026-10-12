'use client';

import { useEffect, useRef } from 'react';

export default function SkillsMenu({
  skills = [],
  query = '',
  selectedIndex = 0,
  onSelect,
}) {
  const listRef = useRef(null);

  // Filter skills based on typed query across name, displayName, and description
  const cleanQuery = (query || '').toLowerCase().trim();
  const filteredSkills = skills.filter((s) => {
    if (!cleanQuery) return true;
    const nameMatch = s.name.toLowerCase().includes(cleanQuery);
    const displayMatch = s.displayName && s.displayName.toLowerCase().includes(cleanQuery);
    const descMatch = s.description && s.description.toLowerCase().includes(cleanQuery);
    return nameMatch || displayMatch || descMatch;
  });

  // Ensure active item is scrolled into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('.skills-dropdown-item.active');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="skills-dropdown-menu" id="skills-autocomplete-dropdown">
      <div className="skills-dropdown-header">
        <div className="skills-dropdown-title">
          <span>🧠</span> Available Skills
        </div>
        <div className="skills-dropdown-hint">
          <kbd>↑↓</kbd> navigate · <kbd>Enter</kbd> or click to select
        </div>
      </div>

      <div className="skills-dropdown-list" ref={listRef}>
        {filteredSkills.length === 0 ? (
          <div className="skills-dropdown-empty">
            No matching skills for <code>/{query}</code>
          </div>
        ) : (
          filteredSkills.map((s, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={s.name}
                type="button"
                className={`skills-dropdown-item ${isSelected ? 'active' : ''}`}
                // onMouseDown prevents blur on the textarea before selection completes
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(s);
                }}
              >
                <div className="skills-dropdown-icon">🧠</div>
                <div className="skills-dropdown-content">
                  <div className="skills-dropdown-name-row">
                    <span className="skills-dropdown-name">
                      {s.displayName || s.name}
                    </span>
                    <span className="skills-dropdown-slug">/{s.name}</span>
                  </div>
                  {s.description && (
                    <div className="skills-dropdown-desc">{s.description}</div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
