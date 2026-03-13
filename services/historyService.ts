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

    // 将新记录插入到最前面
    history.unshift(newItem);
    
    // 💡 核心修复：自动清理机制，防止浏览器缓存撑爆
    let saved = false;
    while (!saved && history.length > 0) {
      try {
        localStorage.setItem(key, JSON.stringify(history));
        saved = true; // 保存成功，跳出循环
      } catch (e: any) {
        // 如果是因为超出了 5MB 限制 (QuotaExceededError)
        if (e.name === 'QuotaExceededError' || e.message.includes('exceeded the quota')) {
          // 删掉数组最后面（最旧）的一条记录，腾出空间，然后继续循环尝试保存
          history.pop();
        } else {
          // 其他未知错误，直接放弃
          console.error("保存历史记录失败", e);
          break;
        }
      }
    }
  },

  getHistory: (userId: string): HistoryItem[] => {
    const key = `${HISTORY_KEY_PREFIX}${userId}`;
    const historyStr = localStorage.getItem(key);
    if (!historyStr) return [];

    let history: HistoryItem[] = JSON.parse(historyStr);
    const now = Date.now();

    // 过滤掉 7 天前的过期记录
    const validHistory = history.filter(item => {
      return (now - item.timestamp) < SEVEN_DAYS_MS;
    });

    // 如果有记录被过滤掉了，更新存储
    if (validHistory.length !== history.length) {
      try {
         localStorage.setItem(key, JSON.stringify(validHistory));
      } catch (e) {}
    }

    return validHistory;
  },
  
  clearHistory: (userId: string) => {
     const key = `${HISTORY_KEY_PREFIX}${userId}`;
     localStorage.removeItem(key);
  }
};