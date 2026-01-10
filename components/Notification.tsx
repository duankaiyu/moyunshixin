import React, { useEffect } from 'react';

interface NotificationProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out">
      <div className="bg-[#fffdf9] border border-stone-300 border-l-4 border-l-red-800 shadow-xl px-8 py-4 rounded-sm flex items-center gap-4 min-w-[300px]">
        <span className="text-red-800 text-xl font-bold">!</span>
        <p className="text-stone-800 font-serif text-lg tracking-wide">{message}</p>
      </div>
    </div>
  );
};