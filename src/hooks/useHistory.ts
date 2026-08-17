import { useState, useEffect } from 'react';

export type HistoryItemType = 
  | 'thumbnail' 
  | 'title_gen' 
  | 'desc_gen' 
  | 'channel_analysis' 
  | 'video_analysis' 
  | 'image_conv'
  | 'image_compress'
  | 'image_crop'
  | 'text_tool' 
  | 'favicon';

export interface HistoryItem {
  id: string;
  type: HistoryItemType;
  title: string;
  description: string;
  timestamp: number;
  url?: string;
}

const HISTORY_KEY = 'naxxivo_user_history';
const MAX_HISTORY_ITEMS = 100;

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    setHistory((prev) => {
      const newItem: HistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      
      const updatedHistory = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const removeHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updatedHistory = prev.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  return {
    history,
    addHistoryItem,
    clearHistory,
    removeHistoryItem
  };
}
