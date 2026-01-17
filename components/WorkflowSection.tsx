import React, { useState, useRef, useEffect } from 'react';
import { WorkflowMode, ModelOption, HistoryItem } from '../types';
import { 
  generatePaintingFromPoem, 
  generatePoemFromPainting, 
  translatePoem, 
  generateAncientPoemFromModern,
  getModelsForMode
} from '../services/workflowService';
import { historyService } from '../services/historyService';
import { PoemCard } from './PoemCard';
import { Notification } from './Notification';
import { ImageModal } from './ImageModal';

interface WorkflowSectionProps {
  userId: string;
}

export const WorkflowSection: React.FC<WorkflowSectionProps> = ({ userId }) => {
  const [activeMode, setActiveMode] = useState<WorkflowMode>(WorkflowMode.POEM_TO_PAINTING);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [notification, setNotification] = useState({ visible: false, message: '' });
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Initialize and load history
  useEffect(() => {
    loadHistory();
  }, [userId]);

  useEffect(() => {
    const models = getModelsForMode(activeMode);
    setAvailableModels(models);
    if (models.length > 0) setSelectedModelId(models[0].id);
  }, [activeMode]);

  const loadHistory = () => {
    const items = historyService.getHistory(userId);
    setHistory(items);
  };

  const showNotification = (msg: string) => {
    setNotification({ visible: true, message: msg });
  };

  const executeWorkflow = async () => {
    if (!selectedModelId) return showNotification("请选择一个模型");
    
    setLoading(true);
    setResult(null);

    try {
      let output = null;
      if (activeMode === WorkflowMode.POEM_TO_PAINTING) {
        output = await generatePaintingFromPoem(inputText, selectedModelId);
        if (!output || typeof output !== 'string') {
           throw new Error("生成图片失败，未能获取有效的图片链接。");
        }
      } else if (activeMode === WorkflowMode.PAINTING_TO_POEM) {
        output = await generatePoemFromPainting(previewImage!, selectedModelId);
      } else if (activeMode === WorkflowMode.TRANSLATION) {
        output = await translatePoem(inputText, selectedModelId);
      } else if (activeMode === WorkflowMode.MODERN_TO_ANCIENT) {
        output = await generateAncientPoemFromModern(inputText, selectedModelId);
      }
      
      setResult(output);
      if (output) {
        // Save and reload history
        historyService.saveItem(userId, activeMode, activeMode === WorkflowMode.PAINTING_TO_POEM ? previewImage! : inputText, output);
        loadHistory();
      }
    } catch (e: any) {
      const msg = e.message || "未知错误";

      // Smart Recovery Logic
      try {
        if (msg.trim().startsWith('{')) {
          const json = JSON.parse(msg);
          const recoveredUrl = json.output || json.data || json.url;
          if (typeof recoveredUrl === 'string' && recoveredUrl.startsWith('http')) {
             setResult(recoveredUrl);
             historyService.saveItem(userId, activeMode, inputText, recoveredUrl);
             loadHistory(); // Reload history on recovery
             setLoading(false);
             return; 
          }
        }
      } catch (recoveryError) {}

      console.error(e);
      showNotification(msg);
    } finally {
      setLoading(false);
    }
  };

  const restoreItem = (item: HistoryItem) => {
    setActiveMode(item.mode);
    setResult(item.result);
    
    // Restore inputs based on mode
    if (item.mode === WorkflowMode.PAINTING_TO_POEM) {
      setPreviewImage(item.input);
      setInputText('');
    } else {
      setInputText(item.input);
      setPreviewImage(null);
    }
    
    // Scroll to top to see result
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showNotification("已恢复该历史记录");
  };

  const getModeLabel = (mode: WorkflowMode) => {
    switch(mode) {
      case WorkflowMode.POEM_TO_PAINTING: return "诗 ➔ 画";
      case WorkflowMode.PAINTING_TO_POEM: return "画 ➔ 诗";
      case WorkflowMode.TRANSLATION: return "古 ➔ 白";
      case WorkflowMode.MODERN_TO_ANCIENT: return "白 ➔ 古";
      default: return mode;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 relative">
       <Notification 
        message={notification.message} 
        isVisible={notification.visible} 
        onClose={() => setNotification(prev => ({ ...prev, visible: false }))} 
      />

       <div className="flex flex-col items-center mb-12">
        <div className="text-center bg-[#f7f5f0]/85 backdrop-blur-md p-8 rounded-lg inline-block w-full border border-stone-300 shadow-md relative">
          <h2 className="text-5xl font-calligraphy text-stone-900 mb-4">墨韵工坊</h2>
          <p className="text-stone-700 font-serif text-lg tracking-wide leading-relaxed">
            诗中有画，画中有诗。
            <span className="hidden md:inline mx-2 opacity-50">|</span>
            泼墨挥毫间，重现东方美学意境。
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center mb-10 border-b border-stone-400/50 bg-[#f7f5f0]/40 rounded-t-lg backdrop-blur-sm">
        {Object.values(WorkflowMode).map(mode => (
          <button
            key={mode}
            onClick={() => { setActiveMode(mode); setResult(null); }}
            className={`px-8 py-4 font-serif text-lg transition-all ${activeMode === mode ? 'text-red-900 border-b-4 border-red-900 bg-red-50/60 font-bold' : 'text-stone-800 hover:bg-stone-200/40'}`}
          >
            {mode === WorkflowMode.POEM_TO_PAINTING && '诗词 ➔ 国画'}
            {mode === WorkflowMode.PAINTING_TO_POEM && '国画 ➔ 诗词'}
            {mode === WorkflowMode.TRANSLATION && '古诗 ➔ 白话'}
            {mode === WorkflowMode.MODERN_TO_ANCIENT && '白话 ➔ 古诗'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-20">
        <div className="bg-[#fffdf9]/90 backdrop-blur-md p-8 rounded shadow-lg border border-stone-200/60">
          <div className="flex justify-between items-center mb-6 border-b border-stone-200 pb-4">
            <h3 className="text-2xl font-serif font-bold text-stone-800 border-l-4 border-red-800 pl-4">输入区域</h3>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="bg-white border border-stone-300 text-stone-800 text-sm rounded px-3 py-1.5 font-serif"
            >
              {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {activeMode === WorkflowMode.PAINTING_TO_POEM ? (
             <div 
               className="w-full h-72 border-2 border-dashed border-stone-400 rounded flex flex-col items-center justify-center cursor-pointer bg-stone-50/80"
               onClick={() => fileInputRef.current?.click()}
             >
               {previewImage ? <img src={previewImage} className="h-full object-contain p-2" /> : <span className="text-stone-400">点击或拖拽上传图片</span>}
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                 const file = e.target.files?.[0];
                 if(file) {
                   const reader = new FileReader();
                   reader.onloadend = () => setPreviewImage(reader.result as string);
                   reader.readAsDataURL(file);
                 }
               }} />
             </div>
          ) : (
            <textarea
              className="w-full h-72 p-6 border border-stone-300 rounded resize-none font-calligraphy text-3xl bg-stone-50/80 text-stone-900 shadow-inner"
              placeholder="请输入创作意境..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={executeWorkflow}
              disabled={loading}
              className="bg-stone-900 text-stone-50 px-10 py-3 rounded-sm font-calligraphy text-2xl tracking-widest shadow hover:bg-stone-700 transition-all disabled:opacity-50"
            >
              {loading ? '笔墨以此生...' : '挥毫 · 泼墨'}
            </button>
          </div>
        </div>

        <div className="bg-[#fffdf9]/90 backdrop-blur-md p-8 rounded shadow-lg border border-stone-200/60 min-h-[460px] flex flex-col">
           <h3 className="text-2xl font-serif font-bold text-stone-800 mb-6 border-l-4 border-red-800 pl-4">生成结果</h3>
           <div className="flex-1 flex items-center justify-center">
              {!result && !loading && <div className="text-stone-400 font-serif">静候佳作...</div>}
              {loading && <div className="animate-pulse font-serif">墨香酝酿中...</div>}
              {activeMode === WorkflowMode.POEM_TO_PAINTING && result && typeof result === 'string' && (
                <div className="flex flex-col items-center">
                  <img src={result} className="max-w-full rounded shadow-md border-8 border-[#f0f0f0]" alt="AI Generated" />
                  <button onClick={() => setViewingImage(result)} className="mt-4 text-stone-500 font-serif text-sm hover:text-red-800 transition-colors">🔍 点击查看大图</button>
                </div>
              )}
              {result && activeMode !== WorkflowMode.POEM_TO_PAINTING && <PoemCard poem={result} />}
           </div>
        </div>
      </div>
      
      {/* History Section */}
      {history.length > 0 && (
        <div className="mt-16 animate-fade-in-up">
          <div className="flex items-center mb-8">
            <div className="flex-1 h-px bg-stone-300"></div>
            <h2 className="text-3xl font-calligraphy text-stone-800 px-6 tracking-wide">雅集 · 往期回顾 (近七日)</h2>
            <div className="flex-1 h-px bg-stone-300"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {history.map((item) => (
              <div 
                key={item.id} 
                onClick={() => restoreItem(item)}
                className="bg-white/80 backdrop-blur-sm border border-stone-200 rounded p-4 shadow-sm hover:shadow-lg hover:border-red-800/30 transition-all cursor-pointer group flex flex-col h-72"
              >
                <div className="flex justify-between items-center mb-3 text-xs font-serif text-stone-500">
                   <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-600 font-bold">{getModeLabel(item.mode)}</span>
                   <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
                
                <div className="flex-1 overflow-hidden bg-stone-50 rounded border border-stone-100 flex items-center justify-center relative">
                  {/* Content Preview */}
                  {item.mode === WorkflowMode.POEM_TO_PAINTING && typeof item.result === 'string' ? (
                     <img src={item.result} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="History" />
                  ) : (
                     <div className="p-4 text-center">
                       {item.mode === WorkflowMode.PAINTING_TO_POEM && item.input.startsWith('data:image') && (
                          <img src={item.input} className="h-20 w-auto mx-auto mb-2 opacity-70" alt="Source" />
                       )}
                       <p className="font-serif text-stone-700 text-sm line-clamp-4 leading-loose">
                         {item.result?.content ? (Array.isArray(item.result.content) ? item.result.content.join(' ') : item.result.content) : 
                          (item.result?.modern || "点击查看详情")}
                       </p>
                     </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors flex items-center justify-center">
                     <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-stone-900 px-4 py-1 rounded-full text-sm font-serif shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                       再次赏析
                     </span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-stone-400 font-serif truncate">
                   {item.mode === WorkflowMode.PAINTING_TO_POEM ? "画作题诗" : item.input}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewingImage && <ImageModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}
    </div>
  );
};