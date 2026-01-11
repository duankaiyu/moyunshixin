import React, { useState } from 'react';
import { SearchFilters, Poem } from '../types';
import { searchPoems } from '../services/workflowService';
import { PoemCard } from './PoemCard';
import { Notification } from './Notification';

export const SearchSection: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    author: '',
    dynasty: '',
    emotion: ''
  });
  const [results, setResults] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '' });

  const showNotification = (msg: string) => {
    setNotification({ visible: true, message: msg });
  };

  // Helper function to fetch poems, either replacing or appending
  const fetchPoems = async (isLoadMore: boolean) => {
    // Validate input before searching
    if (!filters.keyword && !filters.author && !filters.dynasty && !filters.emotion) {
      showNotification("请至少输入一个搜索条件（关键词、作者、朝代或情感）");
      return;
    }
    
    setLoading(true);
    if (!isLoadMore) {
      setSearched(true);
      setResults([]); // Clear if it's a new search
    }

    try {
      // If loading more, pass the current titles to exclude them
      const excludeTitles = isLoadMore ? results.map(p => p.title) : [];
      const newPoems = await searchPoems(filters, excludeTitles);
      
      setResults(prev => isLoadMore ? [...prev, ...newPoems] : newPoems);
    } catch (e) {
      console.error(e);
      showNotification("寻觅失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleNewSearch = () => {
    fetchPoems(false);
  };

  const handleLoadMore = () => {
    fetchPoems(true);
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 relative">
      <Notification 
        message={notification.message} 
        isVisible={notification.visible} 
        onClose={() => setNotification(prev => ({ ...prev, visible: false }))} 
      />

      <div className="text-center mb-12">
        <h2 className="text-4xl font-calligraphy text-stone-800 mb-4">寻幽探胜</h2>
        <p className="text-stone-500 font-serif">输入关键词、作者或朝代，AI为您寻觅古今佳句。</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-stone-200 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="关键词 (如: 月, 酒)"
            className="border-b-2 border-stone-200 px-3 py-2 outline-none focus:border-stone-800 bg-transparent font-calligraphy text-xl text-stone-900 placeholder:text-stone-400 transition-colors"
            value={filters.keyword}
            onChange={(e) => setFilters(p => ({ ...p, keyword: e.target.value }))}
          />
          <input
            type="text"
            placeholder="作者 (如: 李白)"
            className="border-b-2 border-stone-200 px-3 py-2 outline-none focus:border-stone-800 bg-transparent font-calligraphy text-xl text-stone-900 placeholder:text-stone-400 transition-colors"
            value={filters.author}
            onChange={(e) => setFilters(p => ({ ...p, author: e.target.value }))}
          />
          <input
            type="text"
            placeholder="朝代 (如: 唐)"
            className="border-b-2 border-stone-200 px-3 py-2 outline-none focus:border-stone-800 bg-transparent font-calligraphy text-xl text-stone-900 placeholder:text-stone-400 transition-colors"
            value={filters.dynasty}
            onChange={(e) => setFilters(p => ({ ...p, dynasty: e.target.value }))}
          />
          <input
            type="text"
            placeholder="情感 (如: 豪放, 悲伤)"
            className="border-b-2 border-stone-200 px-3 py-2 outline-none focus:border-stone-800 bg-transparent font-calligraphy text-xl text-stone-900 placeholder:text-stone-400 transition-colors"
            value={filters.emotion}
            onChange={(e) => setFilters(p => ({ ...p, emotion: e.target.value }))}
          />
        </div>
        
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleNewSearch}
            disabled={loading}
            className="bg-stone-800 text-[#f7f5f0] px-8 py-2 rounded-sm font-serif hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading && !searched ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                觅句中...
              </>
            ) : (
              '开始寻觅'
            )}
          </button>
        </div>
      </div>

      {/* Results State Handling */}
      {searched && results.length === 0 && !loading && (
         <div className="text-center text-stone-500 font-serif py-12">
            未找到相关诗词，请尝试其他关键词。
         </div>
      )}

      {/* Grid of Poems */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {results.map((poem, idx) => (
          <PoemCard key={`${poem.title}-${idx}`} poem={poem} />
        ))}
      </div>

      {/* "Load More" Button Section */}
      {results.length > 0 && (
        <div className="mt-12 flex justify-center">
           <button
            onClick={handleLoadMore}
            disabled={loading}
            className="bg-white/80 backdrop-blur-sm border border-stone-400 text-stone-800 px-8 py-3 rounded-full font-serif hover:bg-stone-100 hover:border-stone-600 transition-all duration-300 shadow-sm flex items-center gap-2 group"
          >
            {loading ? (
               <svg className="animate-spin h-5 w-5 text-stone-600" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            ) : (
              <>
               <span className="group-hover:rotate-180 transition-transform duration-500">❀</span>
               寻觅更多
               <span className="group-hover:-rotate-180 transition-transform duration-500">❀</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};