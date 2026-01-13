import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import type { ReferenceData } from '@chef-app/shared';

interface ReferenceContextType {
  data: ReferenceData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ReferenceContext = createContext<ReferenceContextType | null>(null);

const emptyData: ReferenceData = {
  units: [],
  ingredients: [],
  cuisineRegions: [],
  cuisineCategories: [],
  cookingMethods: [],
  cookTimeRanges: [],
};

export function ReferenceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.get<ReferenceData>('/reference/all');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
      setData(emptyData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ReferenceContext.Provider value={{ data, isLoading, error, refresh }}>
      {children}
    </ReferenceContext.Provider>
  );
}

export function useReference() {
  const context = useContext(ReferenceContext);
  if (!context) {
    throw new Error('useReference must be used within ReferenceProvider');
  }
  return context;
}
