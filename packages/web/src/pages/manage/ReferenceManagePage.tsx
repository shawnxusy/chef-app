import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReference } from '@/context/ReferenceContext';
import { api } from '@/api/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { ReferenceType, Unit, Ingredient, CuisineRegion, CuisineCategory, CookingMethod, CookTimeRange } from '@chef-app/shared';

// Tab configuration
const tabs: Array<{
  key: ReferenceType;
  label: string;
  icon: string;
  description: string;
}> = [
  { key: 'ingredients', label: '食材', icon: '🥬', description: '管理食材列表及分类' },
  { key: 'units', label: '单位', icon: '⚖️', description: '管理计量单位' },
  { key: 'cuisineRegions', label: '菜系', icon: '🌏', description: '管理菜系分类' },
  { key: 'cuisineCategories', label: '分类', icon: '📂', description: '管理菜谱分类' },
  { key: 'cookingMethods', label: '做法', icon: '🍳', description: '管理烹饪方式' },
  { key: 'cookTimeRanges', label: '时长', icon: '⏱️', description: '管理烹饪时长范围' },
];

// Ingredient categories for dropdown
const ingredientCategories = ['蔬菜', '肉类', '海鲜', '调料', '蛋奶', '豆制品', '主食', '坚果', '干果', '水果', '其他'];

interface DeleteErrorInfo {
  message: string;
  recipes: Array<{ id: string; name: string }>;
}

export function ReferenceManagePage() {
  const { data: refData, isLoading, refresh } = useReference();
  const [activeTab, setActiveTab] = useState<ReferenceType>('ingredients');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<DeleteErrorInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for adding/editing
  const [formName, setFormName] = useState('');
  const [formNameZh, setFormNameZh] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formMinMinutes, setFormMinMinutes] = useState('');
  const [formMaxMinutes, setFormMaxMinutes] = useState('');

  // Get current items based on active tab
  const currentItems = useMemo(() => {
    if (!refData) return [];
    switch (activeTab) {
      case 'ingredients': return refData.ingredients;
      case 'units': return refData.units;
      case 'cuisineRegions': return refData.cuisineRegions;
      case 'cuisineCategories': return refData.cuisineCategories;
      case 'cookingMethods': return refData.cookingMethods;
      case 'cookTimeRanges': return refData.cookTimeRanges;
      default: return [];
    }
  }, [refData, activeTab]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm) return currentItems;
    const term = searchTerm.toLowerCase();
    return currentItems.filter((item) => {
      const name = 'name' in item ? item.name : '';
      const nameZh = 'nameZh' in item ? (item as Unit).nameZh : '';
      const label = 'label' in item ? (item as CookTimeRange).label : '';
      const category = 'category' in item ? (item as Ingredient).category || '' : '';
      return (
        name.toLowerCase().includes(term) ||
        nameZh?.toLowerCase().includes(term) ||
        label.toLowerCase().includes(term) ||
        category.toLowerCase().includes(term)
      );
    });
  }, [currentItems, searchTerm]);

  // Group ingredients by category
  const groupedIngredients = useMemo(() => {
    if (activeTab !== 'ingredients') return {};
    return (filteredItems as Ingredient[]).reduce((acc, ing) => {
      const cat = ing.category || '其他';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ing);
      return acc;
    }, {} as Record<string, Ingredient[]>);
  }, [filteredItems, activeTab]);

  const resetForm = () => {
    setFormName('');
    setFormNameZh('');
    setFormCategory('');
    setFormLabel('');
    setFormMinMinutes('');
    setFormMaxMinutes('');
    setIsAdding(false);
    setEditingId(null);
    setDeleteError(null);
  };

  const startEditing = (item: Unit | Ingredient | CuisineRegion | CuisineCategory | CookingMethod | CookTimeRange) => {
    setEditingId(item.id);
    setIsAdding(false);
    setDeleteError(null);
    
    if ('nameZh' in item) {
      setFormName((item as Unit).name);
      setFormNameZh((item as Unit).nameZh);
    } else if ('category' in item) {
      setFormName((item as Ingredient).name);
      setFormCategory((item as Ingredient).category || '');
    } else if ('label' in item) {
      setFormLabel((item as CookTimeRange).label);
      setFormMinMinutes((item as CookTimeRange).minMinutes?.toString() || '');
      setFormMaxMinutes((item as CookTimeRange).maxMinutes?.toString() || '');
    } else {
      setFormName((item as CuisineRegion | CuisineCategory | CookingMethod).name);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setDeleteError(null);

    try {
      const body: Record<string, unknown> = {};

      if (activeTab === 'units') {
        body.name = formName;
        body.nameZh = formNameZh;
      } else if (activeTab === 'ingredients') {
        body.name = formName;
        body.category = formCategory || null;
      } else if (activeTab === 'cookTimeRanges') {
        body.label = formLabel;
        body.minMinutes = formMinMinutes ? parseInt(formMinMinutes) : null;
        body.maxMinutes = formMaxMinutes ? parseInt(formMaxMinutes) : null;
      } else {
        body.name = formName;
      }

      if (editingId) {
        await api.put(`/reference/${activeTab}/${editingId}`, body);
      } else {
        await api.post(`/reference/${activeTab}`, body);
      }

      await refresh();
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/reference/${activeTab}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!data.success) {
        if (data.error?.code === 'IN_USE') {
          setDeleteError({
            message: data.error.message,
            recipes: data.error.recipes || [],
          });
          setEditingId(id);
          return;
        }
        throw new Error(data.error?.message || '删除失败');
      }

      await refresh();
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const currentTab = tabs.find((t) => t.key === activeTab)!;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <Link to="/manage" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
          ← 返回菜谱列表
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">数据管理</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">管理食材、单位、菜系等基础数据</p>
      </div>

      {/* Mobile Tab Navigation - Horizontal Scrollable */}
      <div className="md:hidden mb-4 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 min-w-min pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearchTerm('');
                resetForm();
              }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="md:flex md:gap-6">
        {/* Desktop Sidebar - Tab Navigation */}
        <div className="hidden md:block w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearchTerm('');
                  resetForm();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="card">
            {/* Tab Header */}
            <div className="px-4 md:px-6 py-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span>{currentTab.icon}</span>
                    {currentTab.label}管理
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{currentTab.description}</p>
                </div>
                <span className="text-sm text-gray-400">{currentItems.length} 项</span>
              </div>
            </div>

            {/* Search & Add */}
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索..."
                  className="input pl-10 w-full"
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
              <button
                onClick={() => {
                  resetForm();
                  setIsAdding(true);
                }}
                className="btn-primary w-full sm:w-auto"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加
              </button>
            </div>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
              <div className="px-4 md:px-6 py-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {editingId ? '编辑' : '添加新'}{currentTab.label}
                </h3>

                {/* Delete Error with Recipe Links */}
                {deleteError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">{deleteError.message}</p>
                        <p className="text-sm text-red-600 mt-1">请先从以下菜谱中移除该项后再删除：</p>
                        <ul className="mt-2 space-y-1">
                          {deleteError.recipes.map((recipe) => (
                            <li key={recipe.id}>
                              <Link
                                to={`/manage/${recipe.id}`}
                                className="text-sm text-red-700 hover:text-red-900 underline"
                              >
                                {recipe.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                  {activeTab === 'units' && (
                    <>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="英文名 (如: g, tbsp)"
                        className="input w-full sm:w-40"
                      />
                      <input
                        type="text"
                        value={formNameZh}
                        onChange={(e) => setFormNameZh(e.target.value)}
                        placeholder="中文名 (如: 克, 大勺)"
                        className="input w-full sm:w-40"
                      />
                    </>
                  )}

                  {activeTab === 'ingredients' && (
                    <>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="食材名称"
                        className="input w-full sm:w-48"
                      />
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="input w-full sm:w-36"
                      >
                        <option value="">选择分类</option>
                        {ingredientCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </>
                  )}

                  {activeTab === 'cookTimeRanges' && (
                    <>
                      <input
                        type="text"
                        value={formLabel}
                        onChange={(e) => setFormLabel(e.target.value)}
                        placeholder="标签 (如: 15-30分钟)"
                        className="input w-full sm:w-40"
                      />
                      <input
                        type="number"
                        value={formMinMinutes}
                        onChange={(e) => setFormMinMinutes(e.target.value)}
                        placeholder="最小分钟"
                        className="input w-full sm:w-28"
                      />
                      <input
                        type="number"
                        value={formMaxMinutes}
                        onChange={(e) => setFormMaxMinutes(e.target.value)}
                        placeholder="最大分钟"
                        className="input w-full sm:w-28"
                      />
                    </>
                  )}

                  {(activeTab === 'cuisineRegions' || activeTab === 'cuisineCategories' || activeTab === 'cookingMethods') && (
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="名称"
                      className="input w-full sm:w-48"
                    />
                  )}

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="btn-primary flex-1 sm:flex-none"
                    >
                      {isSaving ? <LoadingSpinner size="sm" /> : '保存'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="btn-secondary flex-1 sm:flex-none"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="max-h-[500px] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="px-4 md:px-6 py-12 text-center text-gray-500">
                  {searchTerm ? '无匹配项' : '暂无数据'}
                </div>
              ) : activeTab === 'ingredients' ? (
                // Grouped view for ingredients
                <div className="divide-y divide-gray-100">
                  {Object.entries(groupedIngredients).map(([category, items]) => (
                    <div key={category}>
                      <div className="sticky top-0 px-4 md:px-6 py-2 bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-100">
                        {category}
                        <span className="ml-2 text-gray-400">({items.length})</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`px-4 md:px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                              editingId === item.id ? 'bg-primary-50' : ''
                            }`}
                          >
                            <span className="text-gray-900 truncate mr-2">{item.name}</span>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => startEditing(item)}
                                className="text-gray-400 hover:text-primary-600 transition-colors p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeTab === 'units' ? (
                // Units view
                <div className="divide-y divide-gray-100">
                  {(filteredItems as Unit[]).map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 md:px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        editingId === item.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div className="truncate mr-2">
                        <span className="text-gray-900 font-medium">{item.nameZh}</span>
                        <span className="text-gray-500 ml-2">({item.name})</span>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEditing(item)}
                          className="text-gray-400 hover:text-primary-600 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeTab === 'cookTimeRanges' ? (
                // Time ranges view
                <div className="divide-y divide-gray-100">
                  {(filteredItems as CookTimeRange[]).map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 md:px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        editingId === item.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div className="truncate mr-2">
                        <span className="text-gray-900">{item.label}</span>
                        <span className="text-gray-400 text-sm ml-2">
                          ({item.minMinutes ?? '0'} - {item.maxMinutes ?? '∞'} 分钟)
                        </span>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEditing(item)}
                          className="text-gray-400 hover:text-primary-600 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Simple list view for regions, categories, methods
                <div className="divide-y divide-gray-100">
                  {(filteredItems as Array<CuisineRegion | CuisineCategory | CookingMethod>).map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 md:px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        editingId === item.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      <span className="text-gray-900 truncate mr-2">{item.name}</span>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEditing(item)}
                          className="text-gray-400 hover:text-primary-600 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
