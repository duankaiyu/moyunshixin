import { HistoryItem, WorkflowMode } from "../types";

const HISTORY_KEY_PREFIX = 'ink_verse_history_';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const historyService = {
  saveItem: (userId: string, mode: WorkflowMode, input: string, result: any) => {
    const key = `${HISTORY_KEY_PREFIX}${userId}`;
    const historyStr = localStorage.getItem(key);
    let history: HistoryItem[] = historyStr ? JSON.parse(historyStr) : [];

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      userId,
      timestamp: Date.now(),
      mode,
      input,
      result
    };

    // Add new item to the beginning
    history.unshift(newItem);
    
    // Save back
    localStorage.setItem(key, JSON.stringify(history));
  },

  getHistory: (userId: string): HistoryItem[] => {
    const key = `${HISTORY_KEY_PREFIX}${userId}`;
    const historyStr = localStorage.getItem(key);
    if (!historyStr) return [];

    let history: HistoryItem[] = JSON.parse(historyStr);
    const now = Date.now();

    // Filter out items older than 7 days
    const validHistory = history.filter(item => {
      return (now - item.timestamp) < SEVEN_DAYS_MS;
    });

    // If we filtered anything out, update storage
    if (validHistory.length !== history.length) {
      localStorage.setItem(key, JSON.stringify(validHistory));
    }

    return validHistory;
  },
  
  clearHistory: (userId: string) => {
     const key = `${HISTORY_KEY_PREFIX}${userId}`;
     localStorage.removeItem(key);
  }
};