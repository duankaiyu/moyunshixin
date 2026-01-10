import React, { useState, useRef, useEffect } from 'react';
import { WorkflowMode, ModelOption, HistoryItem } from '../types';
import { 
  generatePaintingFromPoem, 
  generatePoemFromPainting, 
  translatePoem, 
  generateAncientPoemFromModern,
  getModelsForMode
} from '../services/geminiService';
import { historyService } from '../services/historyService';
import { PoemCard } from './PoemCard';
import { Notification } from './Notification';

interface WorkflowSectionProps {
  userId: string;
}

export const WorkflowSection: React.FC<WorkflowSectionProps> = ({ userId }) => {
  const [activeMode, setActiveMode] = useState<WorkflowMode>(WorkflowMode.POEM_TO_PAINTING);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [notification, setNotification] = useState({ visible: false, message: '' });
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Model Selection State
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize models when mode changes
  useEffect(() => {
    const models = getModelsForMode(activeMode);
    setAvailableModels(models);
    if (models.length > 0) {
      setSelectedModelId(models[0].id);
    } else {
      setSelectedModelId('');
    }
    
    // NOTE: Removed setInputText('') and setResult(null) from here.
    // This allows loadHistoryItem to set the mode AND the result without it being immediately wiped by this effect.
  }, [activeMode]);

  // Load History on Mount
  useEffect(() => {
    if (userId) {
      const savedHistory = historyService.getHistory(userId);
      setHistory(savedHistory);
    }
  }, [userId]);

  const showNotification = (msg: string) => {
    setNotification({ visible: true, message: msg });
  };

  const changeMode = (mode: WorkflowMode) => {
    if (mode === activeMode) return;
    setActiveMode(mode);
    
    // Manually reset state only when the user explicitly clicks a tab
    setInputText('');
    setResult(null);
    setPreviewImage(null);
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const saveToHistory = (mode: WorkflowMode, input: string, res: any) => {
    historyService.saveItem(userId, mode, input, res);
    // Refresh local history state
    setHistory(historyService.getHistory(userId));
  };

  const executeWorkflow = async () => {
    if (!selectedModelId) {
      showNotification("请选择一个模型");
      return;
    }

    // Validate Input before proceeding
    let currentInput = "";
    if (activeMode === WorkflowMode.POEM_TO_PAINTING) {
      if (!inputText.trim()) { showNotification("请输入描绘意境的诗句"); return; }
      currentInput = inputText;
    } else if (activeMode === WorkflowMode.PAINTING_TO_POEM) {
      if (!previewImage) { showNotification("请上传或拖拽图片"); return; }
      // Save the Base64 string so we can restore the image view later
      currentInput = previewImage;
    } else if (activeMode === WorkflowMode.TRANSLATION) {
      if (!inputText.trim()) { showNotification("请输入需要翻译的古诗词"); return; }
      currentInput = inputText;
    } else if (activeMode === WorkflowMode.MODERN_TO_ANCIENT) {
      if (!inputText.trim()) { showNotification("请输入现代白话文"); return; }
      currentInput = inputText;
    }

    setLoading(true);
    setResult(null);

    try {
      let output = null;
      if (activeMode === WorkflowMode.POEM_TO_PAINTING) {
        output = await generatePaintingFromPoem(inputText, selectedModelId);
      } else if (activeMode === WorkflowMode.PAINTING_TO_POEM) {
        output = await generatePoemFromPainting(previewImage!, selectedModelId);
      } else if (activeMode === WorkflowMode.TRANSLATION) {
        output = await translatePoem(inputText, selectedModelId);
      } else if (activeMode === WorkflowMode.MODERN_TO_ANCIENT) {
        output = await generateAncientPoemFromModern(inputText, selectedModelId);
      }
      
      setResult(output);
      if (output) {
        saveToHistory(activeMode, currentInput, output);
      }
    } catch (e) {
      console.error("Workflow failed", e);
      showNotification("生成失败，请检查 API 配置或网络连接");
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    // 1. Set the mode
    setActiveMode(item.mode);
    
    // 2. Set the data directly
    setResult(item.result);
    
    // 3. Restore inputs
    if (item.mode === WorkflowMode.PAINTING_TO_POEM) {
      // Restore the image preview from the saved input (Base64)
      setPreviewImage(item.input);
      // Reset text input to avoid confusion
      setInputText('');
    } else {
      setInputText(item.input);
      setPreviewImage(null);
    }
    setShowHistory(false);
    showNotification("已加载历史创作");
  };

  const getHistoryLabel = (mode: WorkflowMode) => {
    switch(mode) {
      case WorkflowMode.POEM_TO_PAINTING: return '文生图';
      case WorkflowMode.PAINTING_TO_POEM: return '图生文';
      case WorkflowMode.TRANSLATION: return '翻译';
      case WorkflowMode.MODERN_TO_ANCIENT: return '改写';
      default: return '未知';
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
          <p className="text-stone-700 font-serif text-lg">诗画同源，意境互通。开启您的东方美学创作之旅。</p>
          
          <button 
            onClick={() => setShowHistory(true)}
            className="absolute top-8 right-8 text-stone-600 hover:text-red-900 font-serif flex items-center gap-2 border border-stone-300 px-3 py-1 rounded bg-white/50 hover:bg-white transition-all"
          >
            <span>📜</span> 我的雅集 ({history.length})
          </button>
        </div>
      </div>

      {/* History Drawer/Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/30 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div className="w-full max-w-md bg-[#fffdf9] h-full shadow-2xl p-6 overflow-y-auto border-l border-stone-300 animate-slide-in-right" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-stone-200 pb-4">
              <h3 className="text-2xl font-calligraphy text-stone-900">我的雅集</h3>
              <button onClick={() => setShowHistory(false)} className="text-stone-500 hover:text-stone-900 text-xl">×</button>
            </div>
            
            {history.length === 0 ? (
              <p className="text-stone-500 text-center font-serif mt-12">暂无创作记录，快去挥毫泼墨吧。</p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-stone-400 text-center mb-4">记录仅保留7天</p>
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="p-4 bg-stone-50 border border-stone-200 rounded hover:border-red-800 hover:shadow-md cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded">{getHistoryLabel(item.mode)}</span>
                      <span className="text-xs text-stone-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Content Preview */}
                    <div className="text-stone-800 font-serif text-sm mb-2">
                      {item.mode === WorkflowMode.PAINTING_TO_POEM ? (
                        <div className="flex items-center gap-3 bg-stone-100 p-2 rounded border border-stone-200">
                          <img src={item.input} alt="History Thumbnail" className="w-12 h-12 object-cover rounded shadow-sm" />
                          <div className="flex flex-col">
                             <span className="font-bold text-xs text-stone-600">《图生文》</span>
                             <span className="text-xs text-stone-400 truncate w-40">{item.result?.title || '无题'}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="line-clamp-2">{item.input}</p>
                      )}
                    </div>

                    <div className="text-right">
                       <span className="text-xs text-red-800 opacity-0 group-hover:opacity-100 transition-opacity">点击查看 ➔</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap justify-center mb-10 border-b border-stone-400/50 bg-[#f7f5f0]/40 rounded-t-lg backdrop-blur-sm">
        <button
          onClick={() => changeMode(WorkflowMode.POEM_TO_PAINTING)}
          className={`px-4 md:px-8 py-4 font-serif text-lg md:text-xl transition-all ${activeMode === WorkflowMode.POEM_TO_PAINTING ? 'text-red-900 border-b-4 border-red-900 bg-red-50/60 font-bold' : 'text-stone-800 hover:text-stone-900 hover:bg-stone-200/40'}`}
        >
          诗词 ➔ 国画
        </button>
        <button
          onClick={() => changeMode(WorkflowMode.PAINTING_TO_POEM)}
          className={`px-4 md:px-8 py-4 font-serif text-lg md:text-xl transition-all ${activeMode === WorkflowMode.PAINTING_TO_POEM ? 'text-red-900 border-b-4 border-red-900 bg-red-50/60 font-bold' : 'text-stone-800 hover:text-stone-900 hover:bg-stone-200/40'}`}
        >
          国画 ➔ 诗词
        </button>
        <button
          onClick={() => changeMode(WorkflowMode.TRANSLATION)}
          className={`px-4 md:px-8 py-4 font-serif text-lg md:text-xl transition-all ${activeMode === WorkflowMode.TRANSLATION ? 'text-red-900 border-b-4 border-red-900 bg-red-50/60 font-bold' : 'text-stone-800 hover:text-stone-900 hover:bg-stone-200/40'}`}
        >
          古诗 ➔ 白话
        </button>
        <button
          onClick={() => changeMode(WorkflowMode.MODERN_TO_ANCIENT)}
          className={`px-4 md:px-8 py-4 font-serif text-lg md:text-xl transition-all ${activeMode === WorkflowMode.MODERN_TO_ANCIENT ? 'text-red-900 border-b-4 border-red-900 bg-red-50/60 font-bold' : 'text-stone-800 hover:text-stone-900 hover:bg-stone-200/40'}`}
        >
          白话 ➔ 古诗
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Input Area */}
        <div className="bg-[#fffdf9]/90 backdrop-blur-md p-8 rounded shadow-lg border border-stone-200/60">
          
          <div className="flex justify-between items-center mb-6 border-b border-stone-200 pb-4">
            <h3 className="text-2xl font-serif font-bold text-stone-800 border-l-4 border-red-800 pl-4">
              {activeMode === WorkflowMode.POEM_TO_PAINTING && '输入诗词'}
              {activeMode === WorkflowMode.PAINTING_TO_POEM && '上传画作'}
              {activeMode === WorkflowMode.TRANSLATION && '输入古文'}
              {activeMode === WorkflowMode.MODERN_TO_ANCIENT && '输入白话文'}
            </h3>

            {/* Model Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="model-select" className="text-stone-600 font-serif text-sm">选择模型:</label>
              <select
                id="model-select"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="bg-white border border-stone-300 text-stone-800 text-sm rounded focus:ring-red-900 focus:border-red-900 block px-3 py-1.5 font-serif shadow-sm cursor-pointer hover:border-stone-400"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-[300px] flex flex-col justify-between">
            {activeMode !== WorkflowMode.PAINTING_TO_POEM ? (
              <textarea
                className="w-full h-72 p-6 border border-stone-300 rounded resize-none focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 font-calligraphy text-3xl leading-loose bg-stone-50/80 text-stone-900 placeholder:text-stone-400 shadow-inner"
                placeholder={
                  activeMode === WorkflowMode.TRANSLATION ? "请输入需要翻译的古诗词..." : 
                  activeMode === WorkflowMode.MODERN_TO_ANCIENT ? "请输入您想表达的现代白话意境..." :
                  "请输入描绘意境的诗句..."
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            ) : (
              <div 
                className={`w-full h-72 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                  isDragging 
                    ? 'border-red-600 bg-red-50/50 scale-[1.02]' 
                    : 'border-stone-400 bg-stone-50/80 hover:border-stone-600 hover:bg-stone-100/80'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="h-full object-contain p-2" />
                ) : (
                  <>
                    <span className={`text-5xl mb-3 font-light transition-colors ${isDragging ? 'text-red-500' : 'text-stone-400'}`}>+</span>
                    <span className={`font-serif text-xl transition-colors ${isDragging ? 'text-red-800 font-bold' : 'text-stone-600'}`}>
                      {isDragging ? '松开以上传' : '拖拽图片至此 或 点击上传'}
                    </span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                onClick={executeWorkflow}
                disabled={loading}
                className="bg-stone-900 text-stone-50 px-10 py-3 rounded-sm font-calligraphy text-xl shadow hover:bg-stone-700 transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-105"
              >
                {loading && (
                   <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                )}
                {activeMode === WorkflowMode.POEM_TO_PAINTING && '挥毫泼墨'}
                {activeMode === WorkflowMode.PAINTING_TO_POEM && '题诗吟咏'}
                {activeMode === WorkflowMode.TRANSLATION && '今语解意'}
                {activeMode === WorkflowMode.MODERN_TO_ANCIENT && '炼字成诗'}
              </button>
            </div>
          </div>
        </div>

        {/* Output Area */}
        <div className="bg-[#fffdf9]/90 backdrop-blur-md p-8 rounded shadow-lg border border-stone-200/60 min-h-[460px] relative">
           <h3 className="text-2xl font-serif font-bold text-stone-800 mb-6 border-l-4 border-red-800 pl-4">
            生成结果
          </h3>
          
          <div className="flex items-center justify-center h-full pb-8">
            {!result && !loading && (
              <div className="text-stone-400 text-center select-none">
                <div className="text-8xl mb-6 font-calligraphy opacity-20">墨</div>
                <p className="font-serif text-xl">暂无内容，请开始创作</p>
              </div>
            )}

            {loading && (
               <div className="text-stone-600 text-center animate-pulse">
                  <p className="font-serif text-xl">AI 正在构思中...</p>
               </div>
            )}

            {/* Mode 1: Result is Image */}
            {activeMode === WorkflowMode.POEM_TO_PAINTING && result && (
              <div className="w-full">
                <img src={result} alt="AI Generated" className="w-full h-auto rounded shadow-md border-8 border-[#f0f0f0]" />
              </div>
            )}

            {/* Mode 2 & 4: Result is Poem Object */}
            {(activeMode === WorkflowMode.PAINTING_TO_POEM || activeMode === WorkflowMode.MODERN_TO_ANCIENT) && result && (
              <PoemCard poem={result} vertical />
            )}

            {/* Mode 3: Result is Translation Object */}
            {activeMode === WorkflowMode.TRANSLATION && result && (
              <div className="w-full space-y-6">
                <div className="bg-stone-50/70 p-6 rounded border-l-4 border-stone-400">
                  <h4 className="font-bold text-stone-900 mb-3 font-serif text-xl">现代白话文</h4>
                  <p className="text-stone-800 leading-relaxed font-serif whitespace-pre-wrap text-lg">{result.modern}</p>
                </div>
                <div className="bg-stone-50/70 p-6 rounded border-l-4 border-stone-400">
                   <h4 className="font-bold text-stone-900 mb-3 font-serif text-xl">赏析</h4>
                   <p className="text-stone-700 leading-relaxed font-serif text-base">{result.analysis}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};