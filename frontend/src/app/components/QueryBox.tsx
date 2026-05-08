import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface QueryBoxProps {
  onQuery: (query: string) => void;
}

const PROMPT_SUGGESTIONS = [
  'Show quarter-end transactions above ₹5,00,000',
  'Find manual journal entries posted after 8 PM',
  'List round-value transactions above ₹1,00,000',
  'Identify unusual narration patterns',
  'Show entries posted on weekends',
  'Highlight transactions flagged as high risk'
];

export default function QueryBox({ onQuery }: QueryBoxProps) {
  const [query, setQuery] = useState('');
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Rotate suggestions every 4.5 seconds when input is empty and not focused
  useEffect(() => {
    if (query.length === 0 && !isFocused) {
      const interval = setInterval(() => {
        setCurrentSuggestionIndex((prev) => (prev + 1) % PROMPT_SUGGESTIONS.length);
      }, 4500);

      return () => clearInterval(interval);
    }
  }, [query, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onQuery(query.trim());
      setQuery('');
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className="bg-white">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder=" "
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#095859] focus:border-[#095859]"
          />
          {/* Animated Placeholder Suggestions */}
          {query.length === 0 && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden w-[calc(100%-2rem)]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentSuggestionIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="text-sm text-gray-400 block whitespace-nowrap"
                >
                  {PROMPT_SUGGESTIONS[currentSuggestionIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-6 py-3 bg-[#095859] text-white rounded-lg hover:bg-[#0B6B6A] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span className="font-medium">Run</span>
        </button>
      </form>
    </div>
  );
}