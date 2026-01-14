import { useRef } from 'react';
import type { RecipeStepInput, StepImage } from '@chef-app/shared';

interface StepEditorProps {
  steps: RecipeStepInput[];
  onChange: (steps: RecipeStepInput[]) => void;
  // Mapping from imageId to StepImage info (for existing images)
  stepImageMap?: Map<string, StepImage>;
  // Mapping from imageId to File preview URL (for new pending uploads)
  pendingImageUrls?: Map<string, string>;
  // Called when user adds new images to a step
  onAddImages?: (stepIndex: number, files: File[]) => void;
  // Called when user removes an image from a step
  onRemoveImage?: (stepIndex: number, imageId: string) => void;
}

const MAX_IMAGES_PER_STEP = 3;

export function StepEditor({
  steps,
  onChange,
  stepImageMap = new Map(),
  pendingImageUrls = new Map(),
  onAddImages,
  onRemoveImage,
}: StepEditorProps) {
  const fileInputRefs = useRef<Map<number, HTMLInputElement | null>>(new Map());

  const updateStepText = (index: number, text: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], text };
    onChange(newSteps);
  };

  const addStep = () => {
    onChange([...steps, { text: '', imageIds: [] }]);
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

  const handleFileSelect = (stepIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0 && onAddImages) {
      const currentImageCount = steps[stepIndex].imageIds?.length || 0;
      const remainingSlots = MAX_IMAGES_PER_STEP - currentImageCount;
      const filesToAdd = selectedFiles.slice(0, remainingSlots);
      if (filesToAdd.length > 0) {
        onAddImages(stepIndex, filesToAdd);
      }
    }
    // Reset input
    const input = fileInputRefs.current.get(stepIndex);
    if (input) {
      input.value = '';
    }
  };

  const getImageUrl = (imageId: string): string | null => {
    // Check pending uploads first
    const pendingUrl = pendingImageUrls.get(imageId);
    if (pendingUrl) return pendingUrl;

    // Then check existing step images
    const stepImage = stepImageMap.get(imageId);
    if (stepImage) return stepImage.filePath;

    return null;
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const imageIds = step.imageIds || [];
        const canAddMoreImages = imageIds.length < MAX_IMAGES_PER_STEP;

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

            {/* Step images */}
            <div className="flex flex-wrap gap-2">
              {/* Existing and pending images */}
              {imageIds.map((imageId) => {
                const url = getImageUrl(imageId);
                const isPending = pendingImageUrls.has(imageId);
                if (!url) return null;

                return (
                  <div key={imageId} className="relative w-24 h-24 group">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {isPending && (
                      <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                        待上传
                      </span>
                    )}
                    {onRemoveImage && (
                      <button
                        type="button"
                        onClick={() => onRemoveImage(index, imageId)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add image button */}
              {canAddMoreImages && onAddImages && (
                <button
                  type="button"
                  onClick={() => fileInputRefs.current.get(index)?.click()}
                  className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs mt-1">添加图片</span>
                </button>
              )}

              {/* Hidden file input */}
              <input
                ref={(el) => { fileInputRefs.current.set(index, el); }}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileSelect(index, e)}
                className="hidden"
              />
            </div>

            {/* Image count hint */}
            {imageIds.length > 0 && (
              <p className="text-xs text-gray-400">
                {imageIds.length}/{MAX_IMAGES_PER_STEP} 张图片
              </p>
            )}
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
