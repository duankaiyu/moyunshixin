import React from 'react';
import { Poem } from '../types';
import { Seal } from './Seal';

interface PoemCardProps {
  poem: Poem;
  vertical?: boolean; 
}

export const PoemCard: React.FC<PoemCardProps> = ({ poem }) => {
  // Robust check for poem data integrity
  if (!poem) return null;

  // Handle potential data inconsistencies (e.g. content not being an array)
  let content: string[] = [];
  if (Array.isArray(poem.content)) {
    content = poem.content;
  } else if (typeof poem.content === 'string') {
    content = [poem.content];
  } else {
    // Fallback if content is missing
    content = ["(暂无诗句内容)"];
  }

  // Always use '墨韵' for the seal
  const sealText = '墨韵';

  return (
    <div className="relative bg-[#fffdf9] border border-stone-200 shadow-lg p-8 rounded-sm group hover:shadow-xl transition-shadow duration-500 w-full mx-auto flex flex-col h-full">
      {/* Decorative corner patterns */}
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-stone-300 opacity-50 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-stone-300 opacity-50 rounded-bl-lg" />
      
      {/* Personal Seal - Fixed to '墨韵' */}
      <div className="absolute top-6 right-6 opacity-90 z-10 rotate-12 group-hover:rotate-6 transition-transform duration-500 ease-out origin-center">
        <Seal text={sealText} size={42} />
      </div>

      <div className="w-full flex-grow flex flex-col items-center">
        <h3 className="text-2xl font-serif text-stone-900 mb-2 text-center font-bold px-4 leading-tight">
          {poem.title || "无题"}
        </h3>
        <div className="flex justify-center gap-2 text-stone-500 text-sm mb-6 font-serif">
          <span>[{poem.dynasty || "未知"}]</span>
          <span>{poem.author || "佚名"}</span>
        </div>

        {/* 
           Unified Horizontal Layout
        */}
        <div className="flex flex-col items-center gap-3 text-lg md:text-xl text-stone-800 font-serif leading-loose w-full px-2">
          {content.map((line, idx) => (
            <p key={idx} className="w-full text-center break-words whitespace-normal">
              {line}
            </p>
          ))}
        </div>
      </div>

      {poem.explanation && (
        <div className="mt-8 pt-6 border-t border-stone-100 w-full">
          <p className="text-stone-500 text-sm italic text-center font-serif leading-relaxed">
            {poem.explanation}
          </p>
        </div>
      )}
    </div>
  );
};