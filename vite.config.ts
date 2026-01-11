import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载当前目录下的 .env 文件
  // 第三个参数 '' 表示加载所有变量，不限制前缀
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        // 配置代理解决 Coze API 跨域问题
        '/coze-api': {
          target: 'https://api.coze.cn',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/coze-api/, ''),
        },
      },
    },
    define: {
      // ⚠️ 关键点：
      // 必须使用 JSON.stringify() 包裹变量值。
      // 这样 Vite 会将 process.env.KEY 替换为字符串字面量 "value"
      // 否则会替换为 value (被视为变量)，导致浏览器报错 "pat_xxx is not defined"
      
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      
      // 分模块配置 Coze Key (从 .env 读取)
      'process.env.COZE_API_KEY_PAINTING': JSON.stringify(env.COZE_API_KEY_PAINTING || ''), // 文生图
      'process.env.COZE_API_KEY_POEM': JSON.stringify(env.COZE_API_KEY_POEM || ''),     // 图生文
      'process.env.COZE_API_KEY_TRANS': JSON.stringify(env.COZE_API_KEY_TRANS || ''),    // 翻译
    },
  }
})