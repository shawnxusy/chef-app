import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useReference } from '@/context/ReferenceContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { IngredientInput } from '@/components/IngredientInput';
import { StepEditor } from '@/components/StepEditor';
import { ImageUploader } from '@/components/ImageUploader';
import { LLMParser } from '@/components/LLMParser';
import type { Recipe, CreateRecipeInput, RecipeIngredientInput, RecipeStepInput, StepImage, ParsedRecipeData } from '@chef-app/shared';

// Track pending step images (not yet uploaded)
interface PendingStepImage {
  tempId: string;
  file: File;
  stepIndex: number;
  previewUrl: string;
}

export function RecipeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: refData, refresh: refreshRef } = useReference();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [alternativeName, setAlternativeName] = useState('');
  const [cookTimeRangeId, setCookTimeRangeId] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>([]);
  const [steps, setSteps] = useState<RecipeStepInput[]>([{ text: '', imageIds: [] }]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ id: string; filePath: string }>>([]);
  const [regionIds, setRegionIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [methodIds, setMethodIds] = useState<string[]>([]);

  // Step images state
  const [existingStepImages, setExistingStepImages] = useState<StepImage[]>([]);
  const [pendingStepImages, setPendingStepImages] = useState<PendingStepImage[]>([]);

  // Build map of imageId -> StepImage for existing images
  const stepImageMap = useMemo(() => {
    const map = new Map<string, StepImage>();
    existingStepImages.forEach(img => map.set(img.id, img));
    return map;
  }, [existingStepImages]);

  // Build map of tempId -> preview URL for pending images
  const pendingImageUrls = useMemo(() => {
    const map = new Map<string, string>();
    pendingStepImages.forEach(img => map.set(img.tempId, img.previewUrl));
    return map;
  }, [pendingStepImages]);

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingStepImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  // Load existing recipe when editing
  useEffect(() => {
    if (!id) return;

    async function fetchRecipe() {
      try {
        const recipe = await api.get<Recipe>(`/recipes/${id}`);
        setName(recipe.name);
        setAlternativeName(recipe.alternativeName || '');
        setCookTimeRangeId(recipe.cookTimeRangeId || '');
        setIngredients(
          recipe.ingredients?.map((ing) => ({
            ingredientId: ing.ingredientId,
            unitId: ing.unitId,
            count: ing.count,
          })) || []
        );
        // Steps are now RecipeStep[] with imageIds
        const loadedSteps: RecipeStepInput[] = recipe.steps?.length
          ? recipe.steps.map(s => ({
              text: s.text,
              imageIds: s.imageIds || []
            }))
          : [{ text: '', imageIds: [] }];
        setSteps(loadedSteps);
        setExistingStepImages(recipe.stepImages || []);
        setExistingImages(recipe.images || []);
        setRegionIds(recipe.regions?.map((r) => r.id) || []);
        setCategoryIds(recipe.categories?.map((c) => c.id) || []);
        setMethodIds(recipe.methods?.map((m) => m.id) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipe();
  }, [id]);

  // Handle adding images to a step
  const handleAddStepImages = useCallback((stepIndex: number, files: File[]) => {
    const newPending: PendingStepImage[] = files.map(file => {
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return {
        tempId,
        file,
        stepIndex,
        previewUrl: URL.createObjectURL(file)
      };
    });

    setPendingStepImages(prev => [...prev, ...newPending]);

    // Add temp IDs to the step
    setSteps(prev => {
      const newSteps = [...prev];
      const step = newSteps[stepIndex];
      newSteps[stepIndex] = {
        ...step,
        imageIds: [...(step.imageIds || []), ...newPending.map(p => p.tempId)]
      };
      return newSteps;
    });
  }, []);

  // Handle removing an image from a step
  const handleRemoveStepImage = useCallback((stepIndex: number, imageId: string) => {
    // Check if it's a pending image
    const pendingIndex = pendingStepImages.findIndex(p => p.tempId === imageId);
    if (pendingIndex >= 0) {
      // Remove from pending and revoke URL
      setPendingStepImages(prev => {
        const img = prev[pendingIndex];
        URL.revokeObjectURL(img.previewUrl);
        return prev.filter((_, i) => i !== pendingIndex);
      });
    } else {
      // Remove from existing step images (mark for removal)
      setExistingStepImages(prev => prev.filter(img => img.id !== imageId));
    }

    // Remove from step's imageIds
    setSteps(prev => {
      const newSteps = [...prev];
      const step = newSteps[stepIndex];
      newSteps[stepIndex] = {
        ...step,
        imageIds: (step.imageIds || []).filter(id => id !== imageId)
      };
      return newSteps;
    });
  }, [pendingStepImages]);

  const handleLLMParsed = (data: ParsedRecipeData) => {
    // Set recipe name if extracted
    if (data.name) {
      setName(data.name);
    }

    // Map parsed data to form inputs
    const newIngredients: RecipeIngredientInput[] = data.ingredients.map((ing) => ({
      ingredientId: ing.matchedIngredientId || '',
      unitId: ing.matchedUnitId || null,
      count: ing.count,
    }));

    setIngredients(newIngredients);

    // Steps now include imageIds from LLM parsing
    const newSteps: RecipeStepInput[] = data.steps.length
      ? data.steps.map(s => ({
          text: s.text,
          imageIds: s.imageId ? [s.imageId] : []
        }))
      : [{ text: '', imageIds: [] }];
    setSteps(newSteps);

    // If LLM downloaded images, they're already in step_images table
    // We need to track them as "existing" step images
    const downloadedImages: StepImage[] = data.steps
      .filter(s => s.imageId)
      .map((s, index) => ({
        id: s.imageId!,
        stepIndex: index,
        filePath: '', // Will be fetched when saved
        sortOrder: 0
      }));
    setExistingStepImages(downloadedImages);

    // Refresh reference data in case new ingredients were added
    refreshRef();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入菜名');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Upload new cover images
      let uploadedImageIds: string[] = [];
      if (imageFiles.length > 0) {
        const uploadResult = await api.upload(imageFiles);
        uploadedImageIds = uploadResult.files.map((f) => f.id);
      }

      // Upload pending step images and map temp IDs to real IDs
      const tempIdToRealId = new Map<string, string>();
      if (pendingStepImages.length > 0) {
        const uploadResult = await api.uploadStepImage(pendingStepImages.map(p => p.file));
        pendingStepImages.forEach((pending, index) => {
          if (uploadResult.files[index]) {
            tempIdToRealId.set(pending.tempId, uploadResult.files[index].id);
          }
        });
      }

      // Build final steps with real image IDs
      const finalSteps: RecipeStepInput[] = steps
        .filter(s => s.text.trim())
        .map(step => ({
          text: step.text.trim(),
          imageIds: (step.imageIds || [])
            .map(id => tempIdToRealId.get(id) || id) // Replace temp IDs with real IDs
            .filter(id => !id.startsWith('pending-')) // Remove any remaining temp IDs
        }));

      const input: CreateRecipeInput = {
        name: name.trim(),
        alternativeName: alternativeName.trim() || undefined,
        cookTimeRangeId: cookTimeRangeId || undefined,
        ingredients: ingredients.filter((ing) => ing.ingredientId),
        steps: finalSteps,
        imageIds: [...existingImages.map((img) => img.id), ...uploadedImageIds],
        regionIds: regionIds.length ? regionIds : undefined,
        categoryIds: categoryIds.length ? categoryIds : undefined,
        methodIds: methodIds.length ? methodIds : undefined,
      };

      if (isEditing) {
        await api.put(`/recipes/${id}`, input);
      } else {
        await api.post('/recipes', input);
      }

      navigate('/manage');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleArrayItem = (arr: string[], item: string, setArr: (arr: string[]) => void) => {
    if (arr.includes(item)) {
      setArr(arr.filter((i) => i !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/manage" className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回列表
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {isEditing ? '编辑菜谱' : '添加菜谱'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">基本信息</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              菜名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="如：宫保鸡丁"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              别名
            </label>
            <input
              type="text"
              value={alternativeName}
              onChange={(e) => setAlternativeName(e.target.value)}
              className="input"
              placeholder="如：Kung Pao Chicken"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              烹饪时长
            </label>
            <div className="flex flex-wrap gap-2">
              {refData?.cookTimeRanges.map((range) => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => setCookTimeRangeId(cookTimeRangeId === range.id ? '' : range.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    cookTimeRangeId === range.id
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

        {/* Tags */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">分类标签</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">菜系</label>
            <div className="flex flex-wrap gap-2">
              {refData?.cuisineRegions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => toggleArrayItem(regionIds, region.id, setRegionIds)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    regionIds.includes(region.id)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
            <div className="flex flex-wrap gap-2">
              {refData?.cuisineCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleArrayItem(categoryIds, category.id, setCategoryIds)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    categoryIds.includes(category.id)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">做法</label>
            <div className="flex flex-wrap gap-2">
              {refData?.cookingMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => toggleArrayItem(methodIds, method.id, setMethodIds)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    methodIds.includes(method.id)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {method.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* LLM Parser - only for new recipes */}
        {!isEditing && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">智能解析</h2>
            <p className="text-sm text-gray-500 mb-4">
              粘贴菜谱链接或上传图片，自动提取食材和步骤
            </p>
            <LLMParser onParsed={handleLLMParsed} />
          </div>
        )}

        {/* Ingredients */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">食材清单</h2>
          <IngredientInput
            ingredients={ingredients}
            onChange={setIngredients}
            availableIngredients={refData?.ingredients || []}
            availableUnits={refData?.units || []}
          />
        </div>

        {/* Steps */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">烹饪步骤</h2>
          <StepEditor
            steps={steps}
            onChange={setSteps}
            stepImageMap={stepImageMap}
            pendingImageUrls={pendingImageUrls}
            onAddImages={handleAddStepImages}
            onRemoveImage={handleRemoveStepImage}
          />
        </div>

        {/* Images */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">菜品图片</h2>
          <ImageUploader
            files={imageFiles}
            onChange={setImageFiles}
            existingImages={existingImages}
            onRemoveExisting={(id) => setExistingImages((imgs) => imgs.filter((img) => img.id !== id))}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4 justify-end">
          <Link to="/manage" className="btn-secondary">
            取消
          </Link>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? <LoadingSpinner size="sm" /> : isEditing ? '保存修改' : '添加菜谱'}
          </button>
        </div>
      </form>
    </div>
  );
}
