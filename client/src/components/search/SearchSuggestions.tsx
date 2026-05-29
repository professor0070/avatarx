import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { LayoutGrid, Tag, User, Hash, Search, Clock, Zap } from 'lucide-react';

interface SearchSuggestion {
  type: 'gig' | 'category' | 'tag' | 'seller';
  text: string;
  count?: number;
  gigId?: string;
  sellerId?: string;
  category?: string;
}

interface SearchHistory {
  id: string;
  query: string;
  timestamp: Date;
  resultsCount: number;
}

interface SearchSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  className?: string;
  showHistory?: boolean;
  showPopular?: boolean;
}

interface PopularSearchItem {
  query: string;
  count: number;
}

interface PopularCategoryItem {
  category: string;
  count: number;
}

interface PopularTagItem {
  tag: string;
  count: number;
}

interface PopularData {
  data?: {
    searches?: PopularSearchItem[];
    categories?: PopularCategoryItem[];
    tags?: PopularTagItem[];
  };
}

export function SearchSuggestions({
  value,
  onChange,
  onSelect,
  placeholder = 'Search gigs, categories, sellers...',
  className = '',
  showHistory = true,
  showPopular = true,
}: SearchSuggestionsProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Fetch autocomplete suggestions
  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['search-autocomplete', value],
    queryFn: async () => {
      if (value.length < 2) return { suggestions: [] };
      const response = await api.get(`/api/search/autocomplete?q=${encodeURIComponent(value)}`);
      return response.data;
    },
    enabled: value.length >= 2,
  });

  // Fetch search history
  const { data: historyData } = useQuery({
    queryKey: ['search-history'],
    queryFn: async () => {
      if (!user) return { history: [] };
      const response = await api.get('/api/search/history');
      return response.data;
    },
    enabled: !!user && showHistory,
  });

  // Fetch popular searches
  const { data: popularData } = useQuery<PopularData>({
    queryKey: ['search-popular'],
    queryFn: async () => {
      const response = await api.get('/api/search/popular');
      return response.data;
    },
    enabled: showPopular,
  });

  // Save search to history
  const saveSearchHistory = useCallback(async (query: string, resultsCount: number) => {
    if (!user || query.trim().length < 2) return;
    
    try {
      await api.post('/api/search/history', {
        query: query.trim(),
        resultsCount,
      });
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const allSuggestions = getAllSuggestions();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && allSuggestions[highlightedIndex]) {
          handleSuggestionClick(allSuggestions[highlightedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'gig':
        if (suggestion.gigId) {
          navigate(`/gig/${suggestion.gigId}`);
        }
        break;
      case 'category':
        navigate(`/browse?category=${encodeURIComponent(suggestion.category || suggestion.text)}`);
        break;
      case 'seller':
        if (suggestion.sellerId) {
          navigate(`/browse?seller=${encodeURIComponent(suggestion.sellerId)}`);
        }
        break;
      case 'tag':
        navigate(`/browse?tags=${encodeURIComponent(suggestion.text)}`);
        break;
    }

    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect?.(suggestion);
  };

  const handleSearch = () => {
    if (value.trim().length < 2) return;
    
    navigate(`/browse?search=${encodeURIComponent(value.trim())}`);
    saveSearchHistory(value.trim(), 0);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleHistoryClick = (historyItem: SearchHistory) => {
    onChange(historyItem.query);
    handleSearch();
  };

  const handlePopularClick = (type: 'search' | 'category' | 'tag', text: string) => {
    switch (type) {
      case 'search':
        onChange(text);
        handleSearch();
        break;
      case 'category':
        navigate(`/browse?category=${encodeURIComponent(text)}`);
        break;
      case 'tag':
        navigate(`/browse?tags=${encodeURIComponent(text)}`);
        break;
    }
    setIsOpen(false);
  };

  const clearHistory = async () => {
    if (!user) return;
    
    try {
      await api.delete('/api/search/history');
      // Refetch history using React Query
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  const getAllSuggestions = (): SearchSuggestion[] => {
    const suggestions: SearchSuggestion[] = [];
    
    if (suggestionsData?.suggestions) {
      suggestions.push(...suggestionsData.suggestions);
    }
    
    if (showHistory && historyData?.history) {
      historyData.history.slice(0, 5).forEach((item: SearchHistory) => {
        suggestions.push({
          type: 'tag',
          text: item.query,
        });
      });
    }
    
    return suggestions;
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'gig':
        return <LayoutGrid className="w-4 h-4 text-slate-400" strokeWidth={1.1} />;
      case 'category':
        return <Tag className="w-4 h-4 text-slate-400" strokeWidth={1.1} />;
      case 'seller':
        return <User className="w-4 h-4 text-slate-400" strokeWidth={1.1} />;
      case 'tag':
      default:
        return <Hash className="w-4 h-4 text-slate-400" strokeWidth={1.1} />;
    }
  };

  const getSuggestionLabel = (suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'gig':
        return suggestion.text;
      case 'category':
        return `Category: ${suggestion.text}`;
      case 'seller':
        return `Seller: ${suggestion.text}`;
      case 'tag':
        return `Tag: ${suggestion.text}`;
      default:
        return suggestion.text;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-10 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {suggestionsLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-indigo-600 rounded-full" />
          ) : (
            <Search className="h-5 w-5 text-slate-400" strokeWidth={1.1} />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg dark:border-slate-800 dark:bg-slate-900 max-h-96 overflow-y-auto">
          {/* Search input */}
          {value.length >= 2 && suggestionsData?.suggestions?.length > 0 && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Suggestions
              </div>
              {suggestionsData.suggestions.map((suggestion: SearchSuggestion, index: number) => (
                <button
                  key={`${suggestion.type}-${suggestion.text}-${index}`}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    highlightedIndex === index
                      ? 'bg-indigo-50 dark:bg-indigo-900/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {getSuggestionIcon(suggestion.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {getSuggestionLabel(suggestion)}
                    </div>
                    {suggestion.count && (
                      <div className="text-xs text-slate-500">
                        {suggestion.count} results
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Search History */}
          {showHistory && historyData?.history?.length > 0 && value.length < 2 && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Recent Searches
                </div>
                <button
                  onClick={clearHistory}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
              {historyData.history.slice(0, 5).map((item: SearchHistory) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleHistoryClick(item)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Clock className="w-4 h-4 text-slate-400" strokeWidth={1.1} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {item.query}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.resultsCount} results • {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {showPopular && popularData && value.length < 2 && (
            <div className="p-2">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Popular
              </div>
              
              {popularData.data?.searches && popularData.data.searches.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-2">Searches</div>
                  {popularData.data.searches.slice(0, 3).map((item) => (
                    <button
                      key={item.query}
                      type="button"
                      onClick={() => handlePopularClick('search', item.query)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Zap className="w-4 h-4 text-slate-400" strokeWidth={1.1} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {item.query}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.count} searches
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {popularData.data?.categories && popularData.data.categories.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-2">Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {popularData.data.categories.slice(0, 4).map((item) => (
                      <button
                        key={item.category}
                        type="button"
                        onClick={() => handlePopularClick('category', item.category)}
                        className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {item.category}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {popularData.data?.tags && popularData.data.tags.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {popularData.data.tags.slice(0, 4).map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handlePopularClick('tag', item.tag)}
                        className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {item.tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {value.length >= 2 && !suggestionsLoading && (!suggestionsData?.suggestions || suggestionsData.suggestions.length === 0) && (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" strokeWidth={1.1} />
              <div className="text-sm">No suggestions found</div>
              <div className="text-xs mt-1">Try searching for gigs, categories, or sellers</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
