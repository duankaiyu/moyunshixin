import React from 'react';

interface SealProps {
  text: string;
  size?: number;
  className?: string;
}

export const Seal: React.FC<SealProps> = ({ text, size = 48, className = '' }) => {
  // Defensive: Fallback to App Name if text is empty
  const displayText = text || '墨韵';
  // Truncate to max 4 chars for the seal
  const chars = displayText.slice(0, 4).split('');
  
  // Layout Logic:
  // 1 char: Centered, large.
  // 2 chars: Vertical stack (standard for personal seals).
  // 3-4 chars: Grid layout (2x2).
  const isGrid = chars.length >= 3;
  const isVertical = chars.length === 2;
  
  // Dynamic font sizing
  let fontSize = size * 0.55; // Default for 1 char
  if (isGrid) fontSize = size * 0.38;
  if (isVertical) fontSize = size * 0.38;

  return (
    <div 
      className={`
        relative inline-flex items-center justify-center rounded-sm select-none overflow-hidden
        bg-[#8B1A10] text-[#f2e6ce] shadow-sm
        ${className}
      `}
      style={{ width: size, height: size }}
    >
       {/* Noise Texture for realistic ink paste look */}
       <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" 
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.6'/%3E%3C/svg%3E")` 
            }}>
       </div>

       {/* Text Container */}
       <div 
         className={`
           font-calligraphy leading-none flex w-full h-full items-center justify-center
           ${isGrid ? 'flex-wrap content-center' : 'flex-col'}
         `}
         style={{ padding: '2px' }}
       >
         {chars.map((char, index) => (
           <span 
             key={index} 
             style={{ 
               fontSize: `${fontSize}px`,
               width: isGrid ? '50%' : 'auto',
               height: isGrid ? '50%' : 'auto',
               textAlign: 'center',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               // Slight transform to simulate seal script elongation
               transform: 'scale(0.9, 1.1)' 
             }}
           >
             {char}
           </span>
         ))}
       </div>
       
       {/* Inner Border (optional, for aesthetics) */}
       <div className="absolute inset-0.5 border border-[#f2e6ce] opacity-20 rounded-sm pointer-events-none"></div>
    </div>
  );
};