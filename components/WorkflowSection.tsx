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
             loadHistory(); 
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
    
    if (item.mode === WorkflowMode.PAINTING_TO_POEM) {
      setPreviewImage(item.input);
      setInputText('');
    } else {
      setInputText(item.input);
      setPreviewImage(null);
    }
    
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
    <div className="max-w-[1800px] mx-auto py-8 px-4 md:px-8 relative">
       <Notification 
        message={notification.message} 
        isVisible={notification.visible} 
        onClose={() => setNotification(prev => ({ ...prev, visible: false }))} 
      />

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        
        {/* ================= LEFT COLUMN: WORKSHOP ================= */}
        <div className="w-full xl:w-3/4 flex flex-col">
          
          <div className="flex flex-col items-center mb-8">
            <div className="text-center bg-[#f7f5f0]/85 backdrop-blur-md p-6 rounded-lg w-full border border-stone-300 shadow-md relative">
              <h2 className="text-4xl font-calligraphy text-stone-900 mb-2">墨韵工坊</h2>
              <p className="text-stone-700 font-serif text-base tracking-wide leading-relaxed">
                诗中有画，画中有诗。
                <span className="hidden md:inline mx-2 opacity-50">|</span>
                泼墨挥毫间，重现东方美学意境。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center mb-8 border-b border-stone-400/50 bg-[#f7f5f0]/40 rounded-t-lg backdrop-blur-sm">
            {Object.values(WorkflowMode).map(mode => (
              <button
                key={mode}
                onClick={() => { setActiveMode(mode); setResult(null); }}
                className={`px-6 py-3 font-serif text-lg transition-all ${activeMode === mode ? 'text-red-900 border-b-4 border-red-900 bg-red-50/60 font-bold' : 'text-stone-800 hover:bg-stone-200/40'}`}
              >
                {mode === WorkflowMode.POEM_TO_PAINTING && '诗词 ➔ 国画'}
                {mode === WorkflowMode.PAINTING_TO_POEM && '国画 ➔ 赏析'}
                {mode === WorkflowMode.TRANSLATION && '古诗 ➔ 白话'}
                {mode === WorkflowMode.MODERN_TO_ANCIENT && '白话 ➔ 古诗'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-12">
            
            {/* Input Panel */}
            <div className="bg-[#fffdf9]/90 backdrop-blur-md p-6 rounded shadow-lg border border-stone-200/60">
              <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-3">
                <h3 className="text-xl font-serif font-bold text-stone-800 border-l-4 border-red-800 pl-3">输入区域</h3>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="bg-white border border-stone-300 text-stone-800 text-sm rounded px-3 py-1.5 font-serif max-w-[180px]"
                >
                  {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              {activeMode === WorkflowMode.PAINTING_TO_POEM ? (
                 <div 
                   className="w-full h-72 border-2 border-dashed border-stone-400 rounded flex flex-col items-center justify-center cursor-pointer bg-stone-50/80 hover:bg-stone-100 transition-colors"
                   onClick={() => fileInputRef.current?.click()}
                 >
                   {previewImage ? <img src={previewImage} className="h-full object-contain p-2" /> : <span className="text-stone-400 font-serif">点击或拖拽上传图片</span>}
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                     const file = e.target.files?.[0];
                     if(file) {
                       const reader = new FileReader();
                       reader.onloadend = () => {
                         // 💡 核心修复：前端画布自动压缩技术
                         const img = new Image();
                         img.onload = () => {
                           const canvas = document.createElement('canvas');
                           const MAX_SIZE = 800; // 限制最大边长，足以让大模型看清细节
                           let width = img.width;
                           let height = img.height;

                           if (width > height && width > MAX_SIZE) {
                             height *= MAX_SIZE / width;
                             width = MAX_SIZE;
                           } else if (height > MAX_SIZE) {
                             width *= MAX_SIZE / height;
                             height = MAX_SIZE;
                           }

                           canvas.width = width;
                           canvas.height = height;
                           const ctx = canvas.getContext('2d');
                           ctx?.drawImage(img, 0, 0, width, height);
                           
                           // 转换为 80% 画质的 JPEG 格式，极大减小体积
                           const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                           setPreviewImage(compressedBase64);
                         };
                         img.src = reader.result as string;
                       };
                       reader.readAsDataURL(file);
                     }
                   }} />
                 </div>
              ) : (
                <textarea
                  className="w-full h-72 p-5 border border-stone-300 rounded resize-none font-calligraphy text-2xl bg-stone-50/80 text-stone-900 shadow-inner focus:outline-none focus:border-red-800 focus:ring-1 focus:ring-red-800/20 transition-all"
                  placeholder="请输入创作意境..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={executeWorkflow}
                  disabled={loading}
                  className="bg-stone-900 text-stone-50 px-8 py-2.5 rounded-sm font-calligraphy text-xl tracking-widest shadow hover:bg-stone-700 transition-all disabled:opacity-50"
                >
                  {loading ? '笔墨以此生...' : '挥毫 · 泼墨'}
                </button>
              </div>
            </div>

            {/* Output Panel */}
            <div className="bg-[#fffdf9]/90 backdrop-blur-md p-6 rounded shadow-lg border border-stone-200/60 min-h-[460px] flex flex-col">
               <h3 className="text-xl font-serif font-bold text-stone-800 mb-4 border-l-4 border-red-800 pl-3">生成结果</h3>
               <div className="flex-1 flex items-center justify-center">
                  {!result && !loading && <div className="text-stone-400 font-serif">静候佳作...</div>}
                  {loading && <div className="animate-pulse font-serif text-stone-500">墨香酝酿中...</div>}
                  
                  {/* 1. 渲染：诗生画 */}
                  {activeMode === WorkflowMode.POEM_TO_PAINTING && result && typeof result === 'string' && (
                    <div className="flex flex-col items-center w-full">
                      <img src={result} className="max-w-full max-h-[500px] object-contain rounded shadow-md border-4 border-[#f0f0f0]" alt="AI Generated" />
                      <button onClick={() => setViewingImage(result)} className="mt-3 text-stone-500 font-serif text-sm hover:text-red-800 transition-colors flex items-center gap-1">
                        <span>🔍</span> 点击查看大图
                      </button>
                    </div>
                  )}

                  {/* 2. 渲染：古今互译 (展示白话文) */}
                  {result && activeMode === WorkflowMode.TRANSLATION && (
                    <div className="w-full bg-[#fffdf9] border border-stone-200 shadow-lg p-8 rounded-sm flex flex-col h-full relative group">
                      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-stone-300 opacity-50 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-stone-300 opacity-50 rounded-bl-lg" />
                      
                      <h3 className="text-2xl font-serif text-stone-900 mb-6 text-center font-bold relative z-10">白话译文</h3>
                      
                      <div className="flex-grow flex flex-col justify-center relative z-10">
                        <p className="text-lg text-stone-800 font-serif leading-loose whitespace-pre-wrap text-center">
                          {result.modern}
                        </p>
                      </div>

                      {result.analysis && (
                        <div className="mt-8 pt-6 border-t border-stone-100 relative z-10">
                          <h4 className="text-[15px] font-serif font-bold text-stone-500 mb-2 text-center">— 深度赏析 —</h4>
                          <p className="text-stone-600 font-serif leading-relaxed text-sm text-justify">
                            {result.analysis}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. 渲染：图生诗、白话转古诗 (展示 PoemCard) */}
                  {result && (activeMode === WorkflowMode.PAINTING_TO_POEM || activeMode === WorkflowMode.MODERN_TO_ANCIENT) && (
                    <PoemCard poem={result} />
                  )}
               </div>
            </div>

          </div>
        </div>

        {/* ================= RIGHT COLUMN: HISTORY SIDEBAR ================= */}
        <div className="w-full xl:w-1/4 flex flex-col gap-6 sticky top-24">
          <div className="flex items-center">
            <div className="flex-1 h-px bg-stone-300"></div>
            <h2 className="text-2xl font-calligraphy text-stone-800 px-4 whitespace-nowrap">雅集 · 往期</h2>
            <div className="flex-1 h-px bg-stone-300"></div>
          </div>
          
          {history.length === 0 && (
             <div className="text-center text-stone-400 py-10 font-serif text-sm bg-white/50 rounded border border-dashed border-stone-300">
               暂无创作记录
             </div>
          )}

          <div className="flex flex-col gap-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
            {history.map((item) => (
              <div 
                key={item.id} 
                onClick={() => restoreItem(item)}
                className="bg-white/90 backdrop-blur-sm border border-stone-200 rounded p-3 shadow-sm hover:shadow-md hover:border-red-800/30 transition-all cursor-pointer group flex flex-col h-64 shrink-0"
              >
                <div className="flex justify-between items-center mb-2 text-xs font-serif text-stone-500">
                   <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600 font-bold scale-90 origin-left">{getModeLabel(item.mode)}</span>
                   <span className="scale-90 origin-right">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
                
                <div className="flex-1 overflow-hidden bg-stone-50 rounded border border-stone-100 flex items-center justify-center relative">
                  {/* Content Preview */}
                  {item.mode === WorkflowMode.POEM_TO_PAINTING && typeof item.result === 'string' ? (
                     <img src={item.result} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="History" />
                  ) : (
                     <div className="p-2 text-center w-full">
                       {item.mode === WorkflowMode.PAINTING_TO_POEM && item.input.startsWith('data:image') && (
                          <img src={item.input} className="h-12 w-auto mx-auto mb-1 opacity-70" alt="Source" />
                       )}
                       <p className="font-serif text-stone-700 text-xs line-clamp-5 leading-loose">
                         {item.result?.content ? (Array.isArray(item.result.content) ? item.result.content.join(' ') : item.result.content) : 
                          (item.result?.modern || "点击查看详情")}
                       </p>
                     </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors flex items-center justify-center">
                     <span className="opacity-0 group-hover:opacity-100 bg-white/95 text-stone-900 px-3 py-1 rounded-full text-xs font-serif shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                       回溯
                     </span>
                  </div>
                </div>

                <p className="mt-2 text-xs text-stone-400 font-serif truncate px-1">
                   {item.mode === WorkflowMode.PAINTING_TO_POEM ? "画作题诗" : item.input}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {viewingImage && <ImageModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}
    </div>
  );
};