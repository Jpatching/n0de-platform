'use client';

import { useState } from 'react';

interface StreamFiltersProps {
  filters: {
    minPrestige: string;
    maxPrestige: string;
    minStakes: string;
    maxStakes: string;
    language: string;
    isEducational: boolean;
    tags: string[];
  };
  onFiltersChange: (filters: StreamFiltersProps['filters']) => void;
}

const prestigeLevels = [
  { value: '0', label: '🔰 Mortal Warrior' },
  { value: '1', label: '⚔️ Spartan General' },
  { value: '2', label: '⚡ Olympian Commander' },
  { value: '3', label: '🏛️ Divine Emperor' },
  { value: '4', label: '👑 GODMODE' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
];

const popularTags = [
  'strategy', 'beginner', 'advanced', 'tutorial', 'analysis', 
  'tournament', 'coaching', 'review', 'live-match', 'q&a'
];

export function StreamFilters({ filters, onFiltersChange }: StreamFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTag, setNewTag] = useState('');

  const updateFilter = (key: keyof typeof filters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const addTag = () => {
    if (newTag.trim() && !filters.tags.includes(newTag.trim().toLowerCase())) {
      updateFilter('tags', [...filters.tags, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateFilter('tags', filters.tags.filter(tag => tag !== tagToRemove));
  };

  const clearAllFilters = () => {
    onFiltersChange({
      minPrestige: '',
      maxPrestige: '',
      minStakes: '',
      maxStakes: '',
      language: '',
      isEducational: false,
      tags: [],
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary flex items-center">
          🔍 Advanced Filters
          {hasActiveFilters && (
            <span className="ml-2 bg-accent-primary text-white text-xs px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-text-muted hover:text-accent-primary transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-accent-primary hover:text-accent-primary/80 transition-colors"
          >
            {isExpanded ? '▲ Hide' : '▼ Show'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Prestige Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Minimum Prestige
              </label>
              <select
                value={filters.minPrestige}
                onChange={(e) => updateFilter('minPrestige', e.target.value)}
                className="w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none"
              >
                <option value="">Any</option>
                {prestigeLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Maximum Prestige
              </label>
              <select
                value={filters.maxPrestige}
                onChange={(e) => updateFilter('maxPrestige', e.target.value)}
                className="w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none"
              >
                <option value="">Any</option>
                {prestigeLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stakes Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Minimum Stakes (SOL)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={filters.minStakes}
                onChange={(e) => updateFilter('minStakes', e.target.value)}
                placeholder="0.0"
                className="w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Maximum Stakes (SOL)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={filters.maxStakes}
                onChange={(e) => updateFilter('maxStakes', e.target.value)}
                placeholder="No limit"
                className="w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Language
            </label>
            <select
              value={filters.language}
              onChange={(e) => updateFilter('language', e.target.value)}
              className="w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="">Any Language</option>
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Educational Toggle */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isEducational}
                onChange={(e) => updateFilter('isEducational', e.target.checked)}
                className="w-4 h-4 text-accent-primary bg-bg-main border-border rounded focus:ring-accent-primary focus:ring-2"
              />
              <span className="text-sm font-medium text-text-primary">
                🎓 Educational streams only
              </span>
            </label>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Tags
            </label>
            
            {/* Popular tags */}
            <div className="mb-3">
              <p className="text-xs text-text-muted mb-2">Popular tags:</p>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (!filters.tags.includes(tag)) {
                        updateFilter('tags', [...filters.tags, tag]);
                      }
                    }}
                    disabled={filters.tags.includes(tag)}
                    className={`
                      text-xs px-2 py-1 rounded transition-colors
                      ${filters.tags.includes(tag)
                        ? 'bg-accent-primary text-white cursor-not-allowed'
                        : 'bg-bg-hover text-text-secondary hover:bg-accent-primary/20 hover:text-accent-primary cursor-pointer'
                      }
                    `}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom tag input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add custom tag..."
                className="flex-1 bg-bg-main border border-border rounded-lg px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none text-sm"
              />
              <button
                onClick={addTag}
                disabled={!newTag.trim()}
                className="bg-accent-primary hover:bg-accent-primary/80 disabled:bg-bg-hover disabled:text-text-muted text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>

            {/* Selected tags */}
            {filters.tags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-text-muted mb-2">Selected tags:</p>
                <div className="flex flex-wrap gap-2">
                  {filters.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center bg-accent-primary text-white text-xs px-2 py-1 rounded"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-300 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 