import { useState } from 'react';
import type { RecipeStepInput } from '@chef-app/shared';

interface StepEditorProps {
  steps: RecipeStepInput[];
  onChange: (steps: RecipeStepInput[]) => void;
}

export function StepEditor({ steps, onChange }: StepEditorProps) {
  const [imageErrors, setImageErrors] = useState<Map<number, boolean>>(new Map());

  const updateStepText = (index: number, text: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], text };
    onChange(newSteps);
  };

  const updateStepImageUrl = (index: number, imageUrl: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], imageUrl: imageUrl || undefined };
    onChange(newSteps);
    // Clear error when URL changes
    setImageErrors((prev) => {
      const next = new Map(prev);
      next.delete(index);
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

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Map(prev).set(index, true));
  };

  const handleImageLoad = (index: number) => {
    setImageErrors((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const hasValidUrl = step.imageUrl && !imageErrors.get(index);

        return (
          <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
            {/* Step header with number and actions */}
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium text-sm">
                {index + 1}
              </span>
              <div className="flex-1" />
              {/* Move buttons */}
              <button
                type="button"
                onClick={() => moveStep(index, 'up')}
                disabled={index === 0}
                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-400"
                title="上移"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveStep(index, 'down')}
                disabled={index === steps.length - 1}
                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-400"
                title="下移"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeStep(index)}
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
              onChange={(e) => updateStepText(index, e.target.value)}
              placeholder={`步骤 ${index + 1} 说明...`}
              className="input w-full min-h-[80px] resize-y"
              rows={2}
            />

            {/* Image URL input */}
            <div className="space-y-2">
              <input
                type="url"
                value={step.imageUrl || ''}
                onChange={(e) => updateStepImageUrl(index, e.target.value)}
                placeholder="图片链接 (可选，如 https://example.com/image.jpg)"
                className="input w-full text-sm"
              />

              {/* Image preview */}
              {step.imageUrl && (
                <div className="relative w-32 h-32">
                  {imageErrors.get(index) ? (
                    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                      图片加载失败
                    </div>
                  ) : (
                    <img
                      src={step.imageUrl}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                      onError={() => handleImageError(index)}
                      onLoad={() => handleImageLoad(index)}
                    />
                  )}
                  {hasValidUrl && (
                    <button
                      type="button"
                      onClick={() => updateStepImageUrl(index, '')}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      title="移除图片"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
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
