import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'avatarx.recentlyViewed';
const MAX_ITEMS = 12;

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const add = useCallback((gigId: string) => {
    setIds((prev) => {
      const next = [gigId, ...prev.filter((id) => id !== gigId)];
      return next.slice(0, MAX_ITEMS);
    });
  }, []);

  return { recentlyViewedIds: ids, addToRecentlyViewed: add };
}
