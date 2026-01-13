import { useState } from 'react';
import type { CuisineRegion, CuisineCategory, CookingMethod, CookTimeRange } from '@chef-app/shared';

interface FilterBarProps {
  regions: CuisineRegion[];
  categories: CuisineCategory[];
  methods: CookingMethod[];
  timeRanges: CookTimeRange[];
  selectedRegionIds: string[];
  selectedCategoryIds: string[];
  selectedMethodIds: string[];
  selectedTimeRangeId: string;
  onRegionChange: (ids: string[]) => void;
  onCategoryChange: (ids: string[]) => void;
  onMethodChange: (ids: string[]) => void;
  onTimeRangeChange: (id: string) => void;
}

export function FilterBar({
  regions,
  categories,
  methods,
  timeRanges,
  selectedRegionIds,
  selectedCategoryIds,
  selectedMethodIds,
  selectedTimeRangeId,
  onRegionChange,
  onCategoryChange,
  onMethodChange,
  onTimeRangeChange,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleItem = (ids: string[], id: string, onChange: (ids: string[]) => void) => {
    if (ids.includes(id)) {
      onChange(ids.filter(i => i !== id));
    } else {
      onChange([...ids, id]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toggle button on mobile */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="sm:hidden flex items-center text-sm text-gray-600"
      >
        <svg
          className={`w-4 h-4 mr-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        筛选条件
      </button>

      <div className={`space-y-3 ${!expanded ? 'hidden sm:block' : ''}`}>
        {/* Regions */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 w-16 shrink-0">菜系:</span>
          {regions.map((region) => (
            <button
              key={region.id}
              onClick={() => toggleItem(selectedRegionIds, region.id, onRegionChange)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedRegionIds.includes(region.id)
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 w-16 shrink-0">分类:</span>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => toggleItem(selectedCategoryIds, category.id, onCategoryChange)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategoryIds.includes(category.id)
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Methods */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 w-16 shrink-0">做法:</span>
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => toggleItem(selectedMethodIds, method.id, onMethodChange)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedMethodIds.includes(method.id)
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {method.name}
            </button>
          ))}
        </div>

        {/* Time Ranges */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 w-16 shrink-0">时长:</span>
          {timeRanges.map((range) => (
            <button
              key={range.id}
              onClick={() => onTimeRangeChange(selectedTimeRangeId === range.id ? '' : range.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedTimeRangeId === range.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
