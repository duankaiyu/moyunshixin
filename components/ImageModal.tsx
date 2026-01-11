import React, { useEffect } from 'react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/98 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Close Button - Fixed to top right */}
      <button 
        onClick={onClose}
        className="fixed top-4 right-4 z-[110] text-white/60 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 group"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <img 
          src={imageUrl} 
          alt="Full View" 
          // Adjusted to 75vh as requested for optimal viewing size
          className="max-w-[95vw] max-h-[75vh] object-contain rounded-sm shadow-2xl border-[4px] border-[#f2f2f2] bg-white pointer-events-auto" 
          onClick={(e) => e.stopPropagation()} 
        />
        
        {/* Caption */}
        <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none select-none">
           <span className="text-white/30 text-xs font-serif tracking-[0.2em] drop-shadow-md">
             ◎ 墨韵丹青 ◎
           </span>
        </div>
      </div>
    </div>
  );
};