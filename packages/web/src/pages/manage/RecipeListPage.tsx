import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useReference } from '@/context/ReferenceContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { RecipeCard } from '@/components/RecipeCard';
import { FilterBar } from '@/components/FilterBar';
import type { RecipeListItem, PaginatedResponse } from '@chef-app/shared';

export function RecipeListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: refData } = useReference();
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL params (as strings for stable dependencies)
  const search = searchParams.get('search') || '';
  const regionIdsParam = searchParams.get('regionIds') || '';
  const categoryIdsParam = searchParams.get('categoryIds') || '';
  const methodIdsParam = searchParams.get('methodIds') || '';
  const cookTimeRangeId = searchParams.get('cookTimeRangeId') || '';

  // Parse arrays for UI usage
  const regionIds = regionIdsParam ? regionIdsParam.split(',') : [];
  const categoryIds = categoryIdsParam ? categoryIdsParam.split(',') : [];
  const methodIds = methodIdsParam ? methodIdsParam.split(',') : [];

  async function fetchRecipes() {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (regionIdsParam) params.set('regionIds', regionIdsParam);
      if (categoryIdsParam) params.set('categoryIds', categoryIdsParam);
      if (methodIdsParam) params.set('methodIds', methodIdsParam);
      if (cookTimeRangeId) params.set('cookTimeRangeId', cookTimeRangeId);
      params.set('page', String(page));
      params.set('pageSize', '20');

      const result = await api.get<PaginatedResponse<RecipeListItem>>(
        `/recipes?${params.toString()}`
      );
      setRecipes(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, regionIdsParam, categoryIdsParam, methodIdsParam, cookTimeRangeId, page]);

  const updateFilter = (key: string, value: string | string[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (Array.isArray(value)) {
      if (value.length > 0) {
        newParams.set(key, value.join(','));
      } else {
        newParams.delete(key);
      }
    } else {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    }
    setSearchParams(newParams);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setPage(1);
  };

  const hasFilters = search || regionIds.length || categoryIds.length || methodIds.length || cookTimeRangeId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">菜谱管理</h1>
          <p className="text-gray-500 mt-1">共 {total} 道菜</p>
        </div>
        <Link to="/manage/new" className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加菜谱
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="搜索菜名或食材..."
          className="input pl-10"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filters */}
      {refData && (
        <FilterBar
          regions={refData.cuisineRegions}
          categories={refData.cuisineCategories}
          methods={refData.cookingMethods}
          timeRanges={refData.cookTimeRanges}
          selectedRegionIds={regionIds}
          selectedCategoryIds={categoryIds}
          selectedMethodIds={methodIds}
          selectedTimeRangeId={cookTimeRangeId}
          onRegionChange={(ids) => updateFilter('regionIds', ids)}
          onCategoryChange={(ids) => updateFilter('categoryIds', ids)}
          onMethodChange={(ids) => updateFilter('methodIds', ids)}
          onTimeRangeChange={(id) => updateFilter('cookTimeRangeId', id)}
        />
      )}

      {/* Clear filters */}
      {hasFilters && (
        <button onClick={clearFilters} className="text-sm text-primary-600 hover:text-primary-700">
          清除筛选条件
        </button>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <button onClick={fetchRecipes} className="btn-secondary mt-4">
            重试
          </button>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <span className="text-3xl">🍽️</span>
          </div>
          <p className="text-gray-500">
            {hasFilters ? '没有找到匹配的菜谱' : '还没有添加菜谱'}
          </p>
          {!hasFilters && (
            <Link to="/manage/new" className="btn-primary mt-4">
              添加第一道菜
            </Link>
          )}
        </div>
      ) : (
        /* Recipe Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            上一页
          </button>
          <span className="flex items-center px-4 text-gray-600">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="btn-secondary"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
