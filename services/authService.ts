import { User } from "../types";

const USERS_KEY = 'ink_verse_users';
const SESSION_KEY = 'ink_verse_current_user';

export const authService = {
  // Validate password: Min 8 chars, alphanumeric only (letters + numbers), no special chars
  validatePassword: (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: "密码长度至少为 8 位" };
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(password);

    if (!isAlphanumeric) {
      return { valid: false, message: "密码仅允许包含字母和数字，不可包含特殊字符" };
    }
    if (!hasLetter || !hasNumber) {
      return { valid: false, message: "密码必须包含字母和数字的组合" };
    }
    return { valid: true, message: "" };
  },

  register: (username: string, password: string, nickname: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const usersStr = localStorage.getItem(USERS_KEY);
        const users = usersStr ? JSON.parse(usersStr) : {};

        if (users[username]) {
          reject(new Error("该账号已存在"));
          return;
        }

        const newUser: User = {
          username,
          nickname,
          createdAt: Date.now()
        };

        // Store user with password (simulated hash)
        users[username] = { ...newUser, password }; 
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        
        // Auto login after register
        localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
        resolve(newUser);
      }, 500); // Simulate network delay
    });
  },

  login: (username: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const usersStr = localStorage.getItem(USERS_KEY);
        const users = usersStr ? JSON.parse(usersStr) : {};
        const user = users[username];

        if (!user || user.password !== password) {
          reject(new Error("账号或密码错误"));
          return;
        }

        const sessionUser: User = {
          username: user.username,
          nickname: user.nickname,
          createdAt: user.createdAt
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        resolve(sessionUser);
      }, 500);
    });
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem(SESSION_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }
};