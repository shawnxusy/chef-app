import { useState } from 'react';
import type { RecipeStepInput } from '@chef-app/shared';

interface StepEditorProps {
  steps: RecipeStepInput[];
  onChange: (steps: RecipeStepInput[]) => void;
}

const MAX_IMAGES_PER_STEP = 3;

export function StepEditor({ steps, onChange }: StepEditorProps) {
  // Track image errors by "stepIndex-imageIndex" key
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  // Track which step is showing the URL input
  const [showUrlInput, setShowUrlInput] = useState<number | null>(null);
  const [newUrlValue, setNewUrlValue] = useState('');

  const updateStepText = (index: number, text: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], text };
    onChange(newSteps);
  };

  const addImageUrl = (stepIndex: number, imageUrl: string) => {
    if (!imageUrl.trim()) return;
    const newSteps = [...steps];
    const currentUrls = newSteps[stepIndex].imageUrls || [];
    if (currentUrls.length >= MAX_IMAGES_PER_STEP) return;
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      imageUrls: [...currentUrls, imageUrl.trim()]
    };
    onChange(newSteps);
    setShowUrlInput(null);
    setNewUrlValue('');
  };

  const removeImageUrl = (stepIndex: number, imageIndex: number) => {
    const newSteps = [...steps];
    const currentUrls = newSteps[stepIndex].imageUrls || [];
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      imageUrls: currentUrls.filter((_, i) => i !== imageIndex)
    };
    onChange(newSteps);
    // Clear error for this image
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.delete(`${stepIndex}-${imageIndex}`);
      return next;
    });
  };

  const addStep = () => {
    onChange([...steps, { text: '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    onChange(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    onChange(newSteps);
  };

  const handleImageError = (stepIndex: number, imageIndex: number) => {
    setImageErrors((prev) => new Set(prev).add(`${stepIndex}-${imageIndex}`));
  };

  const handleImageLoad = (stepIndex: number, imageIndex: number) => {
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.delete(`${stepIndex}-${imageIndex}`);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {steps.map((step, stepIndex) => {
        const imageUrls = step.imageUrls || [];
        const canAddMoreImages = imageUrls.length < MAX_IMAGES_PER_STEP;

        return (
          <div key={stepIndex} className="border border-gray-200 rounded-lg p-4 space-y-3">
            {/* Step header with number and actions */}
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium text-sm">
                {stepIndex + 1}
              </span>
              <div className="flex-1" />
              {/* Move buttons */}
              <button
                type="button"
                onClick={() => moveStep(stepIndex, 'up')}
                disabled={stepIndex === 0}
                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-400"
                title="上移"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveStep(stepIndex, 'down')}
                disabled={stepIndex === steps.length - 1}
                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-400"
                title="下移"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeStep(stepIndex)}
                disabled={steps.length <= 1}
                className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400"
                title="删除步骤"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step text */}
            <textarea
              value={step.text}
              onChange={(e) => updateStepText(stepIndex, e.target.value)}
              placeholder={`步骤 ${stepIndex + 1} 说明...`}
              className="input w-full min-h-[80px] resize-y"
              rows={2}
            />

            {/* Images section */}
            <div className="space-y-2">
              {/* Image previews */}
              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imageUrls.map((url, imageIndex) => {
                    const errorKey = `${stepIndex}-${imageIndex}`;
                    const hasError = imageErrors.has(errorKey);

                    return (
                      <div key={imageIndex} className="relative w-24 h-24 group">
                        {hasError ? (
                          <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-1">
                            加载失败
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover rounded-lg"
                            onError={() => handleImageError(stepIndex, imageIndex)}
                            onLoad={() => handleImageLoad(stepIndex, imageIndex)}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeImageUrl(stepIndex, imageIndex)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="移除图片"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add image URL input */}
              {showUrlInput === stepIndex ? (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newUrlValue}
                    onChange={(e) => setNewUrlValue(e.target.value)}
                    placeholder="输入图片链接..."
                    className="input flex-1 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addImageUrl(stepIndex, newUrlValue);
                      } else if (e.key === 'Escape') {
                        setShowUrlInput(null);
                        setNewUrlValue('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addImageUrl(stepIndex, newUrlValue)}
                    className="btn-primary text-sm px-3"
                  >
                    添加
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUrlInput(null);
                      setNewUrlValue('');
                    }}
                    className="btn-secondary text-sm px-3"
                  >
                    取消
                  </button>
                </div>
              ) : canAddMoreImages ? (
                <button
                  type="button"
                  onClick={() => setShowUrlInput(stepIndex)}
                  className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  添加图片链接 ({imageUrls.length}/{MAX_IMAGES_PER_STEP})
                </button>
              ) : (
                <p className="text-xs text-gray-400">
                  已达最大图片数量 ({MAX_IMAGES_PER_STEP}/{MAX_IMAGES_PER_STEP})
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Add step button */}
      <button
        type="button"
        onClick={addStep}
        className="flex items-center text-primary-600 hover:text-primary-700 text-sm"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        添加步骤
      </button>
    </div>
  );
}
