import { useState, useRef } from 'react';
import { api } from '@/api/client';
import { LoadingSpinner } from './LoadingSpinner';
import type { ParsedRecipeData } from '@chef-app/shared';

interface LLMParserProps {
  onParsed: (data: ParsedRecipeData) => void;
}

export function LLMParser({ onParsed }: LLMParserProps) {
  const [url, setUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Convert to base64
    const base64Promises = files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );

    try {
      const base64Images = await Promise.all(base64Promises);
      setImages((prev) => [...prev, ...base64Images]);
    } catch {
      setError('图片读取失败');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleParse = async () => {
    if (!url && images.length === 0) {
      setError('请输入链接或上传图片');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.post<ParsedRecipeData>('/recipes/parse', {
        url: url || undefined,
        images: images.length > 0 ? images : undefined,
      });

      onParsed(result);

      // Clear inputs after success
      setUrl('');
      setImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* URL input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          菜谱链接
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="粘贴菜谱网页链接..."
          className="input"
          disabled={isLoading}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-sm text-gray-400">或</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          上传图片
        </label>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {images.map((img, index) => (
              <div key={index} className="relative aspect-[4/3]">
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary text-sm"
          disabled={isLoading}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          选择图片
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Parse button */}
      <button
        type="button"
        onClick={handleParse}
        disabled={isLoading || (!url && images.length === 0)}
        className="btn-primary w-full"
      >
        {isLoading ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            解析中...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            智能解析
          </>
        )}
      </button>
    </div>
  );
}
