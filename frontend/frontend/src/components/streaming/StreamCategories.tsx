'use client';

interface StreamCategoriesProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  streamCounts: {
    all: number;
    high_stakes: number;
    educational: number;
    prestige_showcase: number;
    tournaments: number;
    just_chatting: number;
  };
}

const categories = [
  { id: 'all', name: 'All Streams', emoji: '📺', color: 'bg-gray-500' },
  { id: 'high_stakes', name: 'High Stakes', emoji: '💎', color: 'bg-red-500' },
  { id: 'educational', name: 'Educational', emoji: '🎓', color: 'bg-blue-500' },
  { id: 'prestige_showcase', name: 'Prestige Showcase', emoji: '👑', color: 'bg-purple-500' },
  { id: 'tournaments', name: 'Tournaments', emoji: '🏆', color: 'bg-yellow-500' },
  { id: 'just_chatting', name: 'Just Chatting', emoji: '💬', color: 'bg-green-500' },
];

export function StreamCategories({ selectedCategory, onCategoryChange, streamCounts }: StreamCategoriesProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {categories.map((category) => {
        const count = streamCounts[category.id as keyof typeof streamCounts] || 0;
        const isSelected = selectedCategory === category.id;
        
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`
              relative p-4 rounded-lg border-2 transition-all duration-300 text-left
              ${isSelected 
                ? 'border-accent-primary bg-accent-primary/10 shadow-lg shadow-accent-primary/20' 
                : 'border-border bg-bg-card hover:border-accent-primary/50 hover:bg-bg-hover'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{category.emoji}</span>
              {count > 0 && (
                <span className={`
                  px-2 py-1 rounded-full text-xs font-bold text-white
                  ${isSelected ? 'bg-accent-primary' : category.color}
                `}>
                  {count}
                </span>
              )}
            </div>
            
            <h3 className={`font-semibold text-sm mb-1 ${isSelected ? 'text-accent-primary' : 'text-text-primary'}`}>
              {category.name}
            </h3>
            
            <p className="text-xs text-text-muted">
              {count === 0 ? 'No streams' : count === 1 ? '1 stream' : `${count} streams`}
            </p>

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute inset-0 rounded-lg border-2 border-accent-primary animate-pulse"></div>
            )}
          </button>
        );
      })}
    </div>
  );
} 