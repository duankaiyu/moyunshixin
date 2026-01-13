import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { WorkflowSection } from './components/WorkflowSection';
import { AuthModal } from './components/AuthModal';
import { AppSection, User } from './types';
import { authService } from './services/authService';
import { Notification } from './components/Notification';

// Background Decoration Component
const BackgroundDecor: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#f7f5f0]">
    <img 
      src="https://images.unsplash.com/photo-1519965042699-2713f01f8087?q=80&w=2574&auto=format&fit=crop"
      alt="Chinese Ink Landscape Background"
      className="w-full h-full object-cover opacity-30 mix-blend-multiply grayscale contrast-125 saturate-50"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-[#f7f5f0]/50 via-[#f7f5f0]/20 to-[#f7f5f0]/90" />
  </div>
);

const App: React.FC = () => {
  const [section, setSection] = useState<AppSection>(AppSection.HOME);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '' });

  // Load user from session on mount
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleSectionChange = (newSection: AppSection) => {
    if (newSection === AppSection.WORKBENCH && !user) {
      setNotification({ visible: true, message: "墨韵工坊需登录后方可进入" });
      setIsAuthModalOpen(true);
      return;
    }
    setSection(newSection);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    // If the user was trying to access workbench, let them in now
    setSection(AppSection.WORKBENCH);
    setNotification({ visible: true, message: `欢迎，${loggedInUser.nickname}` });
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setSection(AppSection.HOME); // Redirect to home
    setNotification({ visible: true, message: "已安全登出" });
  };

  const renderContent = () => {
    switch (section) {
      case AppSection.WORKBENCH:
        // Pass user ID to WorkflowSection for history tracking
        return user ? <WorkflowSection userId={user.username} /> : null;
      case AppSection.HOME:
      default:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center pt-16 px-4 relative z-10">
             {/* Hero Section */}
             <div className="text-center max-w-5xl mx-auto space-y-8 animate-fade-in-up">
                <h1 className="text-5xl md:text-7xl font-calligraphy text-stone-900 tracking-wider mb-2 drop-shadow-sm leading-tight">
                  墨韵诗心·<span className="font-serif font-bold italic tracking-normal">AI</span>国风创作平台
                </h1>
                <p className="text-xl md:text-2xl text-stone-700 font-serif italic tracking-wide">
                  AI 赋能传统文化，重塑东方美学意境
                </p>
                
                <div className="flex justify-center mt-12">
                   <button 
                     onClick={() => handleSectionChange(AppSection.WORKBENCH)}
                     className="px-12 py-4 bg-stone-900 text-[#f7f5f0] text-xl font-serif rounded-sm shadow-lg hover:bg-stone-800 hover:scale-105 transition-all duration-300 border border-stone-700"
                   >
                     开始创作
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 text-left">
                  <FeatureCard 
                    title="诗画共生" 
                    desc="输入诗词，AI挥毫泼墨，即刻生成国画意境。" 
                  />
                  <FeatureCard 
                    title="画中寻诗" 
                    desc="上传画作，AI为您题诗一首，尽显文人雅趣。" 
                  />
                  <FeatureCard 
                    title="古今通义" 
                    desc="精准的古文今译与深度赏析，打破时空隔阂。" 
                  />
                </div>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen pb-12 relative overflow-x-hidden">
      <BackgroundDecor />
      <Navigation 
        currentSection={section} 
        setSection={handleSectionChange} 
        user={user}
        onLoginClick={() => setIsAuthModalOpen(true)}
        onLogoutClick={handleLogout}
      />
      
      <main className="pt-20 relative z-10">
        {renderContent()}
      </main>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <Notification 
        message={notification.message} 
        isVisible={notification.visible} 
        onClose={() => setNotification(prev => ({ ...prev, visible: false }))} 
      />
    </div>
  );
};

const FeatureCard: React.FC<{title: string, desc: string}> = ({ title, desc }) => (
  <div className="bg-white/60 backdrop-blur-md p-6 rounded border-t-4 border-red-800 shadow-sm hover:shadow-md transition-shadow">
    <h3 className="text-xl font-bold font-serif text-stone-800 mb-3">{title}</h3>
    <p className="text-stone-700 font-serif leading-relaxed">{desc}</p>
  </div>
);

export default App;