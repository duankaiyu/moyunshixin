import React, { useState, useEffect, useRef } from 'react';
import { User, HistoryItem } from '../types';
import { historyService } from '../services/historyService';

interface AdminDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDataModal: React.FC<AdminDataModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allHistory, setAllHistory] = useState<Record<string, HistoryItem[]>>({});
  const [activeTab, setActiveTab] = useState<'users' | 'data'>('users');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    // 1. Load Users
    const usersStr = localStorage.getItem('ink_verse_users');
    const usersMap = usersStr ? JSON.parse(usersStr) : {};
    setUsers(Object.values(usersMap));

    // 2. Load History for all users
    const historyMap: Record<string, HistoryItem[]> = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('ink_verse_history_')) {
        const userId = key.replace('ink_verse_history_', '');
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        historyMap[userId] = items;
      }
    });
    setAllHistory(historyMap);
  };

  const handleExport = () => {
    const exportData = {
      app: "Ink & Verse",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      data: {
        users: localStorage.getItem('ink_verse_users') ? JSON.parse(localStorage.getItem('ink_verse_users')!) : {},
        history: allHistory
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ink_verse_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Basic Validation
        if (!json.data || !json.data.users) {
          alert("无效的数据文件格式");
          return;
        }

        if (confirm("导入将覆盖当前浏览器中的所有数据，确定要继续吗？")) {
          // 1. Restore Users
          localStorage.setItem('ink_verse_users', JSON.stringify(json.data.users));

          // 2. Restore History
          // First clear existing history keys to avoid zombies
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('ink_verse_history_')) {
              localStorage.removeItem(key);
            }
          });

          // Then set new history
          if (json.data.history) {
            Object.entries(json.data.history).forEach(([userId, items]) => {
              localStorage.setItem(`ink_verse_history_${userId}`, JSON.stringify(items));
            });
          }
          
          alert("数据导入成功！页面将刷新。");
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
        alert("导入失败：文件解析错误");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-[#fffdf9] w-full max-w-5xl h-[85vh] rounded shadow-2xl border border-stone-300 flex flex-col animate-fade-in-up overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
          <div>
             <h2 className="text-3xl font-calligraphy text-stone-900">后台数据管理</h2>
             <div className="flex gap-2 mt-2">
               <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded">当前环境: LocalStorage (纯前端)</span>
               <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">后续升级: Database</span>
             </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-800 text-3xl font-serif leading-none">×</button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 bg-stone-100 p-1 rounded-lg">
             <button 
               onClick={() => setActiveTab('users')}
               className={`px-6 py-2 rounded-md text-sm font-serif transition-all ${activeTab === 'users' ? 'bg-white text-stone-900 shadow-sm font-bold' : 'text-stone-500 hover:text-stone-700'}`}
             >
               用户列表 ({users.length})
             </button>
             <button 
               onClick={() => setActiveTab('data')}
               className={`px-6 py-2 rounded-md text-sm font-serif transition-all ${activeTab === 'data' ? 'bg-white text-stone-900 shadow-sm font-bold' : 'text-stone-500 hover:text-stone-700'}`}
             >
               创作记录概览
             </button>
          </div>
          
          <div className="flex gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleImport}
            />
            <button 
              onClick={triggerImport}
              className="flex items-center gap-2 bg-white border border-stone-300 text-stone-700 px-4 py-2 rounded text-sm font-serif hover:bg-stone-50 hover:border-stone-400 transition-all"
            >
              <span>📂</span> 导入备份
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2 rounded text-sm font-serif hover:bg-stone-700 shadow-md transition-all"
            >
              <span>💾</span> 导出保存到电脑
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f7f5f0]/30">
          
          {activeTab === 'users' && (
            <div className="bg-white rounded border border-stone-200 shadow-sm overflow-hidden">
              <table className="w-full text-left font-serif text-sm">
                <thead>
                  <tr className="bg-stone-100 text-stone-600 border-b border-stone-200">
                    <th className="p-4 font-bold">用户名</th>
                    <th className="p-4 font-bold">昵称</th>
                    <th className="p-4 font-bold">注册时间</th>
                    <th className="p-4 font-bold text-center">创作统计</th>
                    <th className="p-4 font-bold text-right">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const count = allHistory[user.username]?.length || 0;
                    return (
                      <tr key={user.username} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                        <td className="p-4 font-bold text-stone-800">{user.username}</td>
                        <td className="p-4 text-stone-600">{user.nickname}</td>
                        <td className="p-4 text-stone-400 font-mono text-xs">{new Date(user.createdAt).toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${count > 0 ? 'bg-red-100 text-red-800' : 'bg-stone-200 text-stone-500'}`}>
                            {count} 作品
                          </span>
                        </td>
                         <td className="p-4 text-right">
                          <span className="text-green-600 text-xs">● 活跃</span>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                     <tr><td colSpan={5} className="p-12 text-center text-stone-400">暂无用户数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="grid grid-cols-1 gap-6">
              {Object.keys(allHistory).length === 0 && (
                <div className="text-center text-stone-400 py-20 font-serif bg-white rounded border border-stone-200 border-dashed">
                  暂无创作数据
                </div>
              )}

              {Object.entries(allHistory).map(([userId, items]) => {
                const user = users.find(u => u.username === userId);
                return (
                  <div key={userId} className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-stone-50 px-6 py-3 border-b border-stone-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-stone-300 flex items-center justify-center text-stone-600 font-bold text-xs">
                          {user?.nickname?.[0] || userId[0]}
                        </div>
                        <h3 className="font-bold text-stone-800">
                          {user ? user.nickname : userId} 
                        </h3>
                      </div>
                      <span className="text-stone-500 text-xs font-serif">{items.length} 条记录</span>
                    </div>
                    
                    <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                      {items.map(item => (
                        <div key={item.id} className="p-4 hover:bg-stone-50 flex items-start gap-4 transition-colors">
                           <div className="text-xs text-stone-400 font-mono whitespace-nowrap mt-1">
                             {new Date(item.timestamp).toLocaleDateString()}
                           </div>
                           
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-xs font-bold text-stone-600 border border-stone-200 px-1.5 rounded">
                                 {item.mode}
                               </span>
                             </div>
                             <p className="text-stone-800 text-sm truncate font-serif" title={typeof item.input === 'string' ? item.input : ''}>
                               {typeof item.input === 'string' && item.input.startsWith('data:') 
                                 ? <span className="text-stone-400 italic">[图片数据]</span> 
                                 : item.input}
                             </p>
                           </div>

                           <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 whitespace-nowrap">
                             已生成
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};