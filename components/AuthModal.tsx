import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Register
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nickname: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!formData.username || !formData.password) {
          throw new Error("请填写账号和密码");
        }
        const user = await authService.login(formData.username, formData.password);
        onLoginSuccess(user);
        onClose();
      } else {
        // Registration Logic
        if (!formData.username || !formData.password || !formData.nickname) {
          throw new Error("请填写所有字段");
        }
        
        // Password Validation
        const passCheck = authService.validatePassword(formData.password);
        if (!passCheck.valid) {
          throw new Error(passCheck.message);
        }

        const user = await authService.register(formData.username, formData.password, formData.nickname);
        onLoginSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ username: '', password: '', nickname: '' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-[#fffdf9] w-full max-w-md p-8 rounded shadow-2xl border border-stone-300 relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 text-2xl font-serif">
          ×
        </button>

        <h2 className="text-3xl font-calligraphy text-center text-stone-900 mb-8">
          {isLogin ? '登 录' : '注 册'}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-800 px-4 py-2 rounded mb-6 text-sm font-serif border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-stone-600 font-serif mb-2">账号</label>
            <input
              type="text"
              className="w-full border-b border-stone-300 bg-transparent py-2 px-1 text-xl font-calligraphy text-stone-800 placeholder:text-stone-400 outline-none focus:border-red-800 transition-colors"
              placeholder="请输入账号"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-stone-600 font-serif mb-2">昵称</label>
              <input
                type="text"
                className="w-full border-b border-stone-300 bg-transparent py-2 px-1 text-xl font-calligraphy text-stone-800 placeholder:text-stone-400 outline-none focus:border-red-800 transition-colors"
                placeholder="您的雅号"
                value={formData.nickname}
                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-stone-600 font-serif mb-2">密码</label>
            <input
              type="password"
              className="w-full border-b border-stone-300 bg-transparent py-2 px-1 text-lg font-serif text-stone-800 placeholder:text-stone-400 outline-none focus:border-red-800 transition-colors tracking-widest"
              placeholder={isLogin ? "请输入密码" : "8位以上，字母数字组合"}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            {!isLogin && <p className="text-xs text-stone-400 mt-1 font-serif">提示：最少8位，需包含字母和数字，不可用特殊字符。</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 text-[#f7f5f0] py-3 rounded-sm font-serif text-lg tracking-widest hover:bg-stone-800 transition-colors mt-4 shadow disabled:opacity-50"
          >
            {loading ? '处理中...' : (isLogin ? '进入雅舍' : '完成注册')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={switchMode}
            className="text-stone-500 hover:text-red-900 font-serif text-sm underline underline-offset-4 decoration-stone-300 hover:decoration-red-900"
          >
            {isLogin ? '还没有账号？去注册' : '已有账号？去登录'}
          </button>
        </div>
      </div>
    </div>
  );
};