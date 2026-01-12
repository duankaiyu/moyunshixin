import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Poem, WorkflowMode, ModelOption } from "../types";

// ============================================================================
// Initialization
// ============================================================================

// 检查 Key 是否存在，如果不存在则标记，但不要立即崩溃，允许应用启动
const apiKey = process.env.API_KEY;
const isKeyValid = apiKey && apiKey !== 'MISSING_KEY';

const ai = new GoogleGenAI({ apiKey: isKeyValid ? apiKey : 'samedummykey' });

// Gemini Constants
const CREATIVE_MODEL = 'gemini-3-pro-preview'; 

// ============================================================================
// UTILITIES: Retry Strategy (关键：解决不稳定的核心)
// ============================================================================

/**
 * 带有指数退避的重试函数
 * 当遇到 429 (Too Many Requests) 或 503 (Service Unavailable) 时自动重试
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>, 
  retries: number = 3, 
  delay: number = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const msg = error.message || error.toString();
    // 检查是否为限流或服务器繁忙错误
    const isRetryable = msg.includes('429') || msg.includes('503') || msg.includes('500') || msg.includes('Overloaded');
    
    if (retries > 0 && isRetryable) {
      console.warn(`API Busy/Limit hit. Retrying in ${delay}ms... (Left: ${retries})`);
      // 等待指定时间
      await new Promise(resolve => setTimeout(resolve, delay));
      // 递归重试，等待时间翻倍 (Exponential Backoff)
      return retryWithBackoff(operation, retries - 1, delay * 2);
    }
    
    // 如果重试次数用尽或不是可重试的错误，则抛出异常
    throw error;
  }
}

// ============================================================================
// COZE CONFIGURATION (Multi-User Setup)
// ============================================================================

// 1. 文生图配置 (Painting Owner)
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

const MODEL_OPTIONS: Record<WorkflowMode, ModelOption[]> = {
  [WorkflowMode.POEM_TO_PAINTING]: [
    { id: 'coze-paint-9-16', name: '墨韵丹青 (9:16 竖幅)' },
    { id: 'coze-paint-4-3', name: '墨韵丹青 (4:3 横幅)' },
    { id: 'coze-paint-1-1', name: '墨韵丹青 (1:1 方图)' },
  ],
  [WorkflowMode.PAINTING_TO_POEM]: [
    { id: 'poem-img-v1', name: '七言绝句 (经典)' }, 
  ],
  [WorkflowMode.TRANSLATION]: [
    { id: 'trans-v1', name: '通俗白话 (易懂)' }, 
  ],
  [WorkflowMode.MODERN_TO_ANCIENT]: [
    { id: 'rewrite-v1', name: '唐诗风格' },
  ],
};

const STYLE_PROMPTS: Record<string, string> = {
  'poem-img-v1': '体裁：七言绝句。要求：意境优美，格律严谨。',
  'trans-v1': '风格：通俗易懂，现代化口语，适合初学者。',
  'rewrite-v1': '风格：唐诗（豪放或浪漫）。',
};

// ============================================================================
// Schemas
// ============================================================================

const POEM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the poem" },
    author: { type: Type.STRING, description: "The author's name" },
    dynasty: { type: Type.STRING, description: "The dynasty (e.g., Tang, Song)" },
    content: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lines of the poem" },
    translation: { type: Type.STRING, description: "Modern Chinese translation" },
    explanation: { type: Type.STRING, description: "Brief analysis or appreciation" },
  },
  required: ['title', 'author', 'dynasty', 'content']
};

const TRANSLATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    modern: { type: Type.STRING, description: "Modern Chinese translation" },
    analysis: { type: Type.STRING, description: "Detailed analysis and appreciation" },
  },
  required: ['modern', 'analysis']
};

// ============================================================================
// Coze Core Logic (Reusable)
// ============================================================================

const selectBestUrl = (urls: string[]): string | null => {
  if (urls.length === 0) return null;
  let bestUrl = urls[0];
  let maxScore = -1;
  for (const url of urls) {
    let score = 0;
    if (/\.(png|jpg|jpeg|webp|gif|bmp)($|\?)/i.test(url)) score += 100;
    if (url.includes('p16-') || url.includes('tos-') || url.includes('volcengine') || url.includes('ciciai')) score += 50;
    if (url.includes('s.coze.cn')) score += 10;
    if (score > maxScore) {
      maxScore = score;
      bestUrl = url;
    }
  }
  return bestUrl;
};

const runCozeWorkflow = async (
  config: { WORKFLOW_ID: string; APP_ID: string; API_KEY?: string },
  parameters: Record<string, any>
): Promise<string | any> => {
  if (!config.API_KEY) throw new Error("COZE_API_KEY_MISSING: 此功能未配置 Coze Token");

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
           const rawString = JSON.stringify(dataJson);
           const urlMatches = rawString.match(/https?:\/\/[^\s"']+/g);
           if (urlMatches) {
             for (const url of urlMatches) {
               if (url.includes('coze.cn/work_flow') || url.includes('coze.cn/space') || url.includes('coze.cn/project')) continue;
               const cleanUrl = url.replace(/[\\"')\]}]+$/, '');
               if (!foundUrls.has(cleanUrl)) foundUrls.add(cleanUrl);
             }
           }
        } catch (e) { }
      }
    }
  }
  return selectBestUrl(Array.from(foundUrls));
};

// ============================================================================
// Service Exports
// ============================================================================

export const getModelsForMode = (mode: WorkflowMode): ModelOption[] => {
  return MODEL_OPTIONS[mode] || [];
};

export const generatePaintingFromPoem = async (poemContent: string, modelId: string): Promise<string | null> => {
  const specificConfig = PAINTING_MODELS_CONFIG[modelId];
  if (!specificConfig) throw new Error(`未找到 ID 为 ${modelId} 的模型配置`);

  const runConfig = { ...specificConfig, API_KEY: process.env.COZE_API_KEY_PAINTING };
  const params = { input: poemContent, prompt: poemContent, content: poemContent };

  const result = await runCozeWorkflow(runConfig, params);
  const urlMatch = typeof result === 'string' ? result.match(/https?:\/\/[^\s<>"')]+/) : null;
  return urlMatch ? urlMatch[0] : null;
};

export const generatePoemFromPainting = async (base64Image: string, modelId: string): Promise<Poem | null> => {
  if (!isKeyValid) throw new Error("API_KEY_MISSING");
  
  const styleInstruction = STYLE_PROMPTS[modelId] || STYLE_PROMPTS['poem-img-v1'];
  const base64Data = base64Image.split(',')[1];
  const contents = { 
    parts: [
      { inlineData: { mimeType: 'image/png', data: base64Data } },
      { text: `Role: Chinese Poet. Task: Write a poem describing this. ${styleInstruction}. Return JSON.` }
    ] 
  };
  
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: CREATIVE_MODEL,
      contents: contents,
      config: { responseMimeType: "application/json", responseSchema: POEM_SCHEMA }
    });
  });
  
  return response.text ? JSON.parse(response.text) : null;
};

export const translatePoem = async (poem: string, modelId: string): Promise<{ modern: string; analysis: string } | null> => {
  if (!isKeyValid) throw new Error("API_KEY_MISSING");

  const styleInstruction = STYLE_PROMPTS[modelId] || STYLE_PROMPTS['trans-v1'];
  const prompt = `Translate to modern Chinese + Analysis. Text: "${poem}". Requirement: ${styleInstruction}. Return JSON.`;
  
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: CREATIVE_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: TRANSLATION_SCHEMA }
    });
  });

  return response.text ? JSON.parse(response.text) : null;
};

export const generateAncientPoemFromModern = async (modernText: string, modelId: string): Promise<Poem | null> => {
  if (!isKeyValid) throw new Error("API_KEY_MISSING");

  const styleInstruction = STYLE_PROMPTS[modelId] || STYLE_PROMPTS['rewrite-v1'];
  const prompt = `Rewrite modern text to classical poem. Text: "${modernText}". Requirement: ${styleInstruction}. Return JSON.`;
  
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: CREATIVE_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: POEM_SCHEMA }
    });
  });
  
  return response.text ? JSON.parse(response.text) : null;
};