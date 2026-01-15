import { useState, useRef, useEffect, useMemo } from 'react';
import { pinyin } from 'pinyin-pro';

interface Option {
  id: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  groupBy?: boolean;
  onCreate?: (searchTerm: string) => Promise<string | null>;  // Returns new item ID or null
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '搜索选择...',
  className = '',
  groupBy = false,
  onCreate,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options based on search (supports both Chinese and pinyin)
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => {
      const label = opt.label.toLowerCase();
      // Convert to pinyin without spaces (e.g., "大米" -> "dami")
      const pinyinLabel = pinyin(opt.label, { toneType: 'none', separator: '' }).toLowerCase();
      return label.includes(term) || pinyinLabel.includes(term);
    });
  }, [options, searchTerm]);

  // Group filtered options
  const groupedOptions = useMemo(() => {
    if (!groupBy) return { '': filteredOptions };
    return filteredOptions.reduce((acc, opt) => {
      const group = opt.group || '其他';
      if (!acc[group]) acc[group] = [];
      acc[group].push(opt);
      return acc;
    }, {} as Record<string, Option[]>);
  }, [filteredOptions, groupBy]);

  // Flatten grouped options for keyboard navigation
  const flatOptions = useMemo(() => {
    if (!groupBy) return filteredOptions;
    return Object.values(groupedOptions).flat();
  }, [groupBy, filteredOptions, groupedOptions]);

  // Get selected option label
  const selectedOption = options.find((opt) => opt.id === value);
  const displayValue = isOpen ? searchTerm : selectedOption?.label || '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlighted = listRef.current.querySelector('[data-highlighted="true"]');
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(0);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchTerm('');
    setHighlightedIndex(0);
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
    inputRef.current?.blur();
  };

  const handleCreate = async () => {
    if (!onCreate || !searchTerm.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newId = await onCreate(searchTerm.trim());
      if (newId) {
        onChange(newId);
        setIsOpen(false);
        setSearchTerm('');
        inputRef.current?.blur();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, flatOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatOptions[highlightedIndex]) {
          handleSelect(flatOptions[highlightedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input w-full pr-8"
        />
        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setSearchTerm('');
            } else {
              inputRef.current?.focus();
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {flatOptions.length === 0 && !onCreate ? (
            <div className="px-3 py-2 text-sm text-gray-500">无匹配项</div>
          ) : flatOptions.length === 0 && onCreate && searchTerm.trim() ? (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full px-3 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {isCreating ? '创建中...' : `创建新食材 "${searchTerm}"`}
            </button>
          ) : groupBy ? (
            Object.entries(groupedOptions).map(([group, items]) =>
              items.length > 0 ? (
                <div key={group}>
                  <div className="sticky top-0 px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                    {group}
                  </div>
                  {items.map((option) => {
                    const globalIndex = flatOptions.findIndex((o) => o.id === option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        data-highlighted={globalIndex === highlightedIndex}
                        onClick={() => handleSelect(option.id)}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                          globalIndex === highlightedIndex
                            ? 'bg-primary-50 text-primary-700'
                            : value === option.id
                            ? 'bg-gray-50 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          {option.label}
                          {value === option.id && (
                            <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null
            )
          ) : (
            flatOptions.map((option, idx) => (
              <button
                key={option.id}
                type="button"
                data-highlighted={idx === highlightedIndex}
                onClick={() => handleSelect(option.id)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  idx === highlightedIndex
                    ? 'bg-primary-50 text-primary-700'
                    : value === option.id
                    ? 'bg-gray-50 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center justify-between">
                  {option.label}
                  {value === option.id && (
                    <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
