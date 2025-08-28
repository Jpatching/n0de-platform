'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, Calendar, DollarSign, Target, Zap, BookmarkPlus, Clock, Sliders } from 'lucide-react';

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  filters: FilterState;
  isDefault?: boolean;
}

interface FilterState {
  search: string;
  gameTypes: string[];
  results: string[];
  amountRange: {
    min: number | null;
    max: number | null;
  };
  dateRange: {
    start: string;
    end: string;
  };
  streakLength: {
    min: number | null;
    max: number | null;
  };
  winRateRange: {
    min: number | null;
    max: number | null;
  };
  tags: string[];
}

interface SmartFilterPanelProps {
  onFiltersChange: (filters: FilterState) => void;
  onBulkAction: (action: string, selectedItems: string[]) => void;
  selectedItems: string[];
  totalItems: number;
  className?: string;
}

const defaultPresets: FilterPreset[] = [
  {
    id: 'big-wins',
    name: 'Big Wins',
    description: 'Wins over $100',
    icon: '🎯',
    filters: {
      search: '',
      gameTypes: [],
      results: ['WIN'],
      amountRange: { min: 100, max: null },
      dateRange: { start: '', end: '' },
      streakLength: { min: null, max: null },
      winRateRange: { min: null, max: null },
      tags: ['big-win']
    }
  },
  {
    id: 'recent-losses',
    name: 'Recent Losses',
    description: 'Losses from last 7 days',
    icon: '⚡',
    filters: {
      search: '',
      gameTypes: [],
      results: ['LOSS'],
      amountRange: { min: null, max: null },
      dateRange: { 
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
      },
      streakLength: { min: null, max: null },
      winRateRange: { min: null, max: null },
      tags: ['recent-loss']
    }
  },
  {
    id: 'comeback-games',
    name: 'Comeback Games',
    description: 'Wins after losing streaks',
    icon: '🔥',
    filters: {
      search: '',
      gameTypes: [],
      results: ['WIN'],
      amountRange: { min: null, max: null },
      dateRange: { start: '', end: '' },
      streakLength: { min: 3, max: null },
      winRateRange: { min: null, max: null },
      tags: ['comeback']
    }
  },
  {
    id: 'high-stakes',
    name: 'High Stakes',
    description: 'Games with wagers over $50',
    icon: '💎',
    filters: {
      search: '',
      gameTypes: [],
      results: [],
      amountRange: { min: 50, max: null },
      dateRange: { start: '', end: '' },
      streakLength: { min: null, max: null },
      winRateRange: { min: null, max: null },
      tags: ['high-stakes']
    }
  },
  {
    id: 'perfect-streak',
    name: 'Perfect Streaks',
    description: 'Win streaks of 5+',
    icon: '🏆',
    filters: {
      search: '',
      gameTypes: [],
      results: ['WIN'],
      amountRange: { min: null, max: null },
      dateRange: { start: '', end: '' },
      streakLength: { min: 5, max: null },
      winRateRange: { min: null, max: null },
      tags: ['perfect-streak']
    }
  }
];

export default function SmartFilterPanel({
  onFiltersChange,
  onBulkAction,
  selectedItems,
  totalItems,
  className = ''
}: SmartFilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    gameTypes: [],
    results: [],
    amountRange: { min: null, max: null },
    dateRange: { start: '', end: '' },
    streakLength: { min: null, max: null },
    winRateRange: { min: null, max: null },
    tags: []
  });

  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPresets, setCustomPresets] = useState<FilterPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const gameTypes = ['RPS', 'MINES', 'COINFLIP', 'CRASH', 'CHESS'];
  const bulkActions = [
    { id: 'add-to-collection', label: 'Add to Collection', icon: '📁' },
    { id: 'add-to-favorites', label: 'Add to Favorites', icon: '❤️' },
    { id: 'share-collection', label: 'Share as Collection', icon: '🔗' },
    { id: 'export-data', label: 'Export Data', icon: '📊' },
    { id: 'delete', label: 'Delete Selected', icon: '🗑️', dangerous: true }
  ];

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  useEffect(() => {
    // Load custom presets from localStorage
    const saved = localStorage.getItem('pnl-filter-presets');
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load custom presets:', error);
      }
    }
  }, []);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setActivePreset(null); // Clear active preset when manually changing filters
  };

  const applyPreset = (preset: FilterPreset) => {
    setFilters(preset.filters);
    setActivePreset(preset.id);
  };

  const saveCustomPreset = () => {
    if (!presetName.trim()) return;

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: presetName,
      description: 'Custom filter preset',
      icon: '⭐',
      filters: { ...filters }
    };

    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('pnl-filter-presets', JSON.stringify(updated));
    
    setPresetName('');
    setShowSavePreset(false);
    setActivePreset(newPreset.id);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      gameTypes: [],
      results: [],
      amountRange: { min: null, max: null },
      dateRange: { start: '', end: '' },
      streakLength: { min: null, max: null },
      winRateRange: { min: null, max: null },
      tags: []
    });
    setActivePreset(null);
  };

  const hasActiveFilters = () => {
    return filters.search || 
           filters.gameTypes.length > 0 || 
           filters.results.length > 0 ||
           filters.amountRange.min !== null || 
           filters.amountRange.max !== null ||
           filters.dateRange.start || 
           filters.dateRange.end ||
           filters.streakLength.min !== null || 
           filters.streakLength.max !== null ||
           filters.winRateRange.min !== null || 
           filters.winRateRange.max !== null ||
           filters.tags.length > 0;
  };

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Filter className="w-5 h-5 text-cyan-400" />
          <h3 className="text-xl font-bold text-white">Smart Filters</h3>
          {hasActiveFilters() && (
            <span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full text-xs font-medium">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              showAdvanced ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by game, amount, result, or notes..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none transition-colors"
        />
      </div>

      {/* Filter Presets */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-300">Quick Filters</h4>
          <button
            onClick={() => setShowSavePreset(true)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Save Current
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {defaultPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`p-3 rounded-lg text-left transition-all duration-200 ${
                activePreset === preset.id
                  ? 'bg-cyan-500/20 border border-cyan-400/50'
                  : 'bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30'
              }`}
            >
              <div className="text-lg mb-1">{preset.icon}</div>
              <div className="text-xs font-medium text-white">{preset.name}</div>
              <div className="text-xs text-slate-400 mt-1">{preset.description}</div>
            </button>
          ))}
        </div>
        
        {/* Custom Presets */}
        {customPresets.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
            {customPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-3 rounded-lg text-left transition-all duration-200 ${
                  activePreset === preset.id
                    ? 'bg-purple-500/20 border border-purple-400/50'
                    : 'bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30'
                }`}
              >
                <div className="text-lg mb-1">{preset.icon}</div>
                <div className="text-xs font-medium text-white">{preset.name}</div>
                <div className="text-xs text-slate-400 mt-1">{preset.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 mb-6 p-4 bg-slate-900/30 rounded-lg border border-slate-600/30">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Advanced Filters</h4>
          
          {/* Game Types */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Game Types</label>
            <div className="flex flex-wrap gap-2">
              {gameTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    const updated = filters.gameTypes.includes(type)
                      ? filters.gameTypes.filter(t => t !== type)
                      : [...filters.gameTypes, type];
                    handleFilterChange('gameTypes', updated);
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
                    filters.gameTypes.includes(type)
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Results</label>
            <div className="flex gap-2">
              {['WIN', 'LOSS'].map((result) => (
                <button
                  key={result}
                  onClick={() => {
                    const updated = filters.results.includes(result)
                      ? filters.results.filter(r => r !== result)
                      : [...filters.results, result];
                    handleFilterChange('results', updated);
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
                    filters.results.includes(result)
                      ? result === 'WIN' 
                        ? 'bg-green-500/20 text-green-400 border border-green-400/50'
                        : 'bg-red-500/20 text-red-400 border border-red-400/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
                  }`}
                >
                  {result}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Min Amount ($)</label>
              <input
                type="number"
                placeholder="0"
                value={filters.amountRange.min || ''}
                onChange={(e) => handleFilterChange('amountRange', {
                  ...filters.amountRange,
                  min: e.target.value ? parseFloat(e.target.value) : null
                })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Max Amount ($)</label>
              <input
                type="number"
                placeholder="∞"
                value={filters.amountRange.max || ''}
                onChange={(e) => handleFilterChange('amountRange', {
                  ...filters.amountRange,
                  max: e.target.value ? parseFloat(e.target.value) : null
                })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Start Date</label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleFilterChange('dateRange', {
                  ...filters.dateRange,
                  start: e.target.value
                })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">End Date</label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleFilterChange('dateRange', {
                  ...filters.dateRange,
                  end: e.target.value
                })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Streak Length */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Min Streak</label>
              <input
                type="number"
                placeholder="0"
                value={filters.streakLength.min || ''}
                onChange={(e) => handleFilterChange('streakLength', {
                  ...filters.streakLength,
                  min: e.target.value ? parseInt(e.target.value) : null
                })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Max Streak</label>
              <input
                type="number"
                placeholder="∞"
                value={filters.streakLength.max || ''}
                onChange={(e) => handleFilterChange('streakLength', {
                  ...filters.streakLength,
                  max: e.target.value ? parseInt(e.target.value) : null
                })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-600/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">
              {selectedItems.length} of {totalItems} selected
            </h4>
            <button
              onClick={() => onBulkAction('select-all', [])}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Select All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {bulkActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onBulkAction(action.id, selectedItems)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  action.dangerous
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-400/30'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
                }`}
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Preset Modal */}
      {showSavePreset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Save Filter Preset</h3>
            <input
              type="text"
              placeholder="Enter preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSavePreset(false);
                  setPresetName('');
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomPreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 