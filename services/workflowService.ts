import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Poem, WorkflowMode, ModelOption } from "../types";

// ============================================================================
// Initialization
// ============================================================================

const apiKey = process.env.API_KEY;
const isKeyValid = apiKey && apiKey !== 'MISSING_KEY';
const ai = new GoogleGenAI({ apiKey: isKeyValid ? apiKey : 'samedummykey' });

// Gemini Constants (作为兜底或直接调用使用)
const CREATIVE_MODEL = 'gemini-3-pro-preview'; 

// ============================================================================
// COZE CONFIGURATION (组员填写区域)
// ============================================================================

/**
 * 1. 文生图配置
 * 对应 API Key: process.env.COZE_API_KEY_PAINTING
 */
const PAINTING_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'coze-paint-9-16': {
    WORKFLOW_ID: '7559058997119860776', 
    APP_ID: '7559025814764027904',
  },
  'coze-paint-4-3': {
    WORKFLOW_ID: '7559058331965718567',
    APP_ID: '7559043000534319123',
  },
  'coze-paint-1-1': {
    WORKFLOW_ID: '7559058177272381481',
    APP_ID: '7559035402452238390',
  }
};

/**
 * 2. 图生文配置 
 * 请在此处填入 3 个不同的工作流 ID
 * 对应 API Key: process.env.COZE_API_KEY_POEM
 */
const POEM_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'coze-poem-1': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', // 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-poem-2': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', // 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-poem-3': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', // 
    APP_ID: 'REPLACE_WITH_ID',
  }
};

/**
 * 3. 翻译/古文配置
 * 请在此处填入 3 个不同的工作流 ID
 * 对应 API Key: process.env.COZE_API_KEY_TRANS
 */
const TRANS_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'coze-trans-1': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', // 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-trans-2': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', // 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-trans-3': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', // 
    APP_ID: 'REPLACE_WITH_ID',
  }
};

/**
 * 4. 白话转古诗配置
 * 请在此处填入 3 个不同的工作流 ID
 * 对应 API Key: process.env.COZE_API_KEY_TRANS (假设共用翻译 Key，或您需要添加新的 Key)
 */
const REWRITE_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'coze-rewrite-1': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', // 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-rewrite-2': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', // 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-rewrite-3': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', // 
    APP_ID: 'REPLACE_WITH_ID',
  }
};

// ============================================================================
// Model Options (UI 显示名称配置)
// ============================================================================

const MODEL_OPTIONS: Record<WorkflowMode, ModelOption[]> = {
  [WorkflowMode.POEM_TO_PAINTING]: [
    { id: 'coze-paint-9-16', name: '墨韵丹青 (9:16 竖幅)' },
    { id: 'coze-paint-4-3', name: '墨韵丹青 (4:3 横幅)' },
    { id: 'coze-paint-1-1', name: '墨韵丹青 (1:1 方图)' },
  ],
  [WorkflowMode.PAINTING_TO_POEM]: [
    { id: 'coze-poem-1', name: '七言绝句 (经典)' }, 
    { id: 'coze-poem-2', name: '五言律诗 (严谨)' }, 
    { id: 'coze-poem-3', name: '宋词长短句 (婉约)' }, 
  ],
  [WorkflowMode.TRANSLATION]: [
    { id: 'coze-trans-1', name: '通俗白话 (易懂)' }, 
    { id: 'coze-trans-2', name: '深度赏析 (学术)' }, 
    { id: 'coze-trans-3', name: '英文意译 (国际)' }, 
  ],
  [WorkflowMode.MODERN_TO_ANCIENT]: [
    { id: 'coze-rewrite-1', name: '唐诗风格 (豪放)' },
    { id: 'coze-rewrite-2', name: '宋词风格 (细腻)' },
    { id: 'coze-rewrite-3', name: '诗经风格 (古朴)' },
  ],
};

// ============================================================================
// Coze Core Logic (Upgraded for Text & Image)
// ============================================================================

const selectBestUrl = (urls: string[]): string | null => {
  if (urls.length === 0) return null;
  return urls[0]; // 简化策略，直接返回第一个匹配到的有效链接
};

/**
 * 通用 Coze 工作流调用函数
 * 支持返回图片 URL (用于文生图) 或 聚合文本 (用于其他模式)
 */
const runCozeWorkflow = async (
  config: { WORKFLOW_ID: string; APP_ID: string; API_KEY?: string },
  parameters: Record<string, any>,
  expectJson: boolean = false // 如果期望返回 JSON 文本，设为 true
): Promise<string> => {
  if (!config.API_KEY) throw new Error("COZE_API_KEY_MISSING: 此功能未配置 Coze Token");
  if (config.WORKFLOW_ID === 'REPLACE_WITH_ID') throw new Error("WORKFLOW_ID_MISSING: 该模型尚未配置 ID，请联系管理员");

  const response = await fetch('/coze-api/v1/workflow/stream_run', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_id: config.WORKFLOW_ID, app_id: config.APP_ID, parameters: parameters })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Coze API Error: ${response.status} - ${errText}`);
  }
  if (!response.body) throw new Error("No response body from Coze API");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  // 用于收集文本输出
  let fullTextOutput = '';
  // 用于收集图片链接
  const foundUrls = new Set<string>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; 

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const dataStr = line.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;
        try {
           const dataJson = JSON.parse(dataStr);
           
           // 1. 尝试提取文本内容 (Coze 工作流通常在 content 或 data 字段返回文本)
           if (dataJson.data && typeof dataJson.data === 'string') {
             fullTextOutput += dataJson.data; // 简单的 append
           } else if (dataJson.content) {
             fullTextOutput += dataJson.content;
           } else if (dataJson.data && dataJson.data.content) {
             fullTextOutput += dataJson.data.content;
           }

           // 2. 尝试提取 URL (用于文生图)
           const rawString = JSON.stringify(dataJson);
           const urlMatches = rawString.match(/https?:\/\/[^\s"']+/g);
           if (urlMatches) {
             for (const url of urlMatches) {
               // 过滤掉 Coze 内部域名的干扰链接
               if (url.includes('coze.cn/work_flow') || url.includes('coze.cn/space')) continue;
               const cleanUrl = url.replace(/[\\"')\]}]+$/, '');
               if (/\.(png|jpg|jpeg|webp|gif|bmp)/i.test(cleanUrl)) {
                 foundUrls.add(cleanUrl);
               }
             }
           }
        } catch (e) { }
      }
    }
  }

  // 结果返回逻辑
  if (expectJson) {
    // 如果是文生图以外的模式，我们优先返回文本内容
    // 假设 Coze 工作流最后输出的是一段 JSON 字符串
    // 我们尝试从收集到的 fullTextOutput 中提取 JSON 部分
    // 或者直接返回 fullTextOutput
    const jsonMatch = fullTextOutput.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : fullTextOutput;
  } else {
    // 文生图模式，优先返回图片 URL
    const bestUrl = selectBestUrl(Array.from(foundUrls));
    if (bestUrl) return bestUrl;
    // 如果没找到图，返回文本报错信息
    return fullTextOutput || "未能生成图片，请重试";
  }
};

// ============================================================================
// Service Exports
// ============================================================================

export const getModelsForMode = (mode: WorkflowMode): ModelOption[] => {
  return MODEL_OPTIONS[mode] || [];
};

// 1. 文生图
export const generatePaintingFromPoem = async (poemContent: string, modelId: string): Promise<string | null> => {
  const specificConfig = PAINTING_MODELS_CONFIG[modelId];
  // 如果找不到配置，抛出错误
  if (!specificConfig) throw new Error(`未找到 ID 为 ${modelId} 的模型配置`);

  const runConfig = { ...specificConfig, API_KEY: process.env.COZE_API_KEY_PAINTING };
  // Coze 参数: input
  const params = { input: poemContent, prompt: poemContent };

  return await runCozeWorkflow(runConfig, params, false); // false = 期望返回图片 URL
};

// 2. 图生文
export const generatePoemFromPainting = async (base64Image: string, modelId: string): Promise<Poem | null> => {
  const specificConfig = POEM_MODELS_CONFIG[modelId];
  
  // 兼容逻辑：如果 Coze ID 未配置(还是REPLACE_WITH_ID)或找不到，尝试使用 Gemini 兜底 (可选)
  if (!specificConfig || specificConfig.WORKFLOW_ID === 'REPLACE_WITH_ID') {
     console.warn("Coze ID 未配置，尝试使用 Gemini 兜底...");
     return await generatePoemFromPaintingGemini(base64Image);
  }

  const runConfig = { ...specificConfig, API_KEY: process.env.COZE_API_KEY_POEM };
  // Coze 参数: image_base64 (假设您的工作流接受此参数)
  const params = { image_base64: base64Image, input: "请根据图片生成诗词" };

  const jsonStr = await runCozeWorkflow(runConfig, params, true); // true = 期望返回 JSON 文本
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Coze 返回的不是有效 JSON:", jsonStr);
    throw new Error("模型返回格式错误，请检查工作流输出是否为 JSON");
  }
};

// 3. 翻译
export const translatePoem = async (poem: string, modelId: string): Promise<{ modern: string; analysis: string } | null> => {
  const specificConfig = TRANS_MODELS_CONFIG[modelId];
  
  if (!specificConfig || specificConfig.WORKFLOW_ID === 'REPLACE_WITH_ID') {
     console.warn("Coze ID 未配置，尝试使用 Gemini 兜底...");
     return await translatePoemGemini(poem);
  }

  const runConfig = { ...specificConfig, API_KEY: process.env.COZE_API_KEY_TRANS };
  const params = { input: poem };

  const jsonStr = await runCozeWorkflow(runConfig, params, true);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Coze JSON Parse Error", jsonStr);
    throw new Error("翻译模型返回格式错误");
  }
};

// 4. 白话转古诗 (改写)
export const generateAncientPoemFromModern = async (modernText: string, modelId: string): Promise<Poem | null> => {
  const specificConfig = REWRITE_MODELS_CONFIG[modelId];

  if (!specificConfig || specificConfig.WORKFLOW_ID === 'REPLACE_WITH_ID') {
      console.warn("Coze ID 未配置，尝试使用 Gemini 兜底...");
      return await generateAncientPoemFromModernGemini(modernText);
  }

  const runConfig = { ...specificConfig, API_KEY: process.env.COZE_API_KEY_TRANS }; // 假设共用 Trans Key
  const params = { input: modernText };

  const jsonStr = await runCozeWorkflow(runConfig, params, true);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Coze JSON Parse Error", jsonStr);
    throw new Error("改写模型返回格式错误");
  }
};


// ============================================================================
// GEMINI FALLBACKS (保留原有的 Gemini 逻辑作为兜底，防止报错)
// ============================================================================

// Retry helper
async function retryWithBackoff<T>(operation: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
  try { return await operation(); } catch (error: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Gemini Schemas
const POEM_SCHEMA_GEMINI: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    author: { type: Type.STRING },
    dynasty: { type: Type.STRING },
    content: { type: Type.ARRAY, items: { type: Type.STRING } },
    translation: { type: Type.STRING },
    explanation: { type: Type.STRING },
  },
  required: ['title', 'author', 'dynasty', 'content']
};

const TRANS_SCHEMA_GEMINI: Schema = {
  type: Type.OBJECT,
  properties: {
    modern: { type: Type.STRING },
    analysis: { type: Type.STRING },
  },
  required: ['modern', 'analysis']
};

const generatePoemFromPaintingGemini = async (base64Image: string): Promise<Poem | null> => {
  if (!isKeyValid) throw new Error("API_KEY_MISSING");
  const base64Data = base64Image.split(',')[1];
  const contents = { 
    parts: [
      { inlineData: { mimeType: 'image/png', data: base64Data } },
      { text: `Role: Chinese Poet. Task: Write a poem describing this. Return JSON.` }
    ] 
  };
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: CREATIVE_MODEL,
      contents: contents,
      config: { responseMimeType: "application/json", responseSchema: POEM_SCHEMA_GEMINI }
    });
  });
  return response.text ? JSON.parse(response.text) : null;
};

const translatePoemGemini = async (poem: string): Promise<{ modern: string; analysis: string } | null> => {
  if (!isKeyValid) throw new Error("API_KEY_MISSING");
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: CREATIVE_MODEL,
      contents: `Translate to modern Chinese + Analysis: "${poem}". Return JSON.`,
      config: { responseMimeType: "application/json", responseSchema: TRANS_SCHEMA_GEMINI }
    });
  });
  return response.text ? JSON.parse(response.text) : null;
};

const generateAncientPoemFromModernGemini = async (text: string): Promise<Poem | null> => {
  if (!isKeyValid) throw new Error("API_KEY_MISSING");
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: CREATIVE_MODEL,
      contents: `Rewrite to classical poem: "${text}". Return JSON.`,
      config: { responseMimeType: "application/json", responseSchema: POEM_SCHEMA_GEMINI }
    });
  });
  return response.text ? JSON.parse(response.text) : null;
};