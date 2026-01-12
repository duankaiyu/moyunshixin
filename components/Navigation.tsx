import React from 'react';
import { AppSection, User } from '../types';

interface NavigationProps {
  currentSection: AppSection;
  setSection: (section: AppSection) => void;
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  currentSection, 
  setSection, 
  user,
  onLoginClick,
  onLogoutClick
}) => {
  const navItems = [
    { id: AppSection.HOME, label: '首页' },
    { id: AppSection.WORKBENCH, label: '墨韵工坊' }, // Workbench
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#f7f5f0]/90 backdrop-blur-sm border-b border-stone-300 shadow-sm h-16 flex items-center justify-between px-6 md:px-12">
      <div className="flex items-center cursor-pointer" onClick={() => setSection(AppSection.HOME)}>
        <span className="text-3xl font-calligraphy text-stone-800 tracking-widest">墨韵诗心</span>
      </div>

      <div className="flex items-center gap-4 md:gap-8">
        <div className="flex gap-4 md:gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`
                relative px-2 py-1 text-lg font-serif transition-colors duration-300
                ${currentSection === item.id 
                  ? 'text-red-900 font-bold' 
                  : 'text-stone-600 hover:text-stone-900'}
              `}
            >
              {item.label}
              {currentSection === item.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-800 transform scale-x-100 transition-transform" />
              )}
            </button>
          ))}
        </div>

        {/* User Status */}
        <div className="ml-4 pl-4 border-l border-stone-300 flex items-center">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-stone-700 font-serif flex flex-col items-end leading-tight">
                <span className="text-xs text-stone-400">雅士</span>
                <span>{user.nickname}</span>
              </span>
              
              <div className="flex flex-col gap-1">
                <button 
                  onClick={onLogoutClick}
                  className="text-[10px] border border-stone-400 rounded px-2 py-0.5 text-stone-500 hover:text-red-800 hover:border-red-800 transition-colors font-serif"
                >
                  登出
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="text-stone-900 font-bold font-serif hover:text-red-900 transition-colors"
            >
              登录 / 注册
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};