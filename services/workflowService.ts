import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Poem, WorkflowMode, ModelOption } from "../types";

// ============================================================================
// Initialization
// ============================================================================

const apiKey = process.env.API_KEY;
const isKeyValid = apiKey && apiKey !== 'MISSING_KEY' && apiKey !== '';
const ai = new GoogleGenAI({ apiKey: isKeyValid ? apiKey : 'samedummykey' });

const CREATIVE_MODEL = 'gemini-3-pro-preview'; 

// ============================================================================
// COZE CONFIGURATION
// ============================================================================

// 1. 文生图配置 (Painting)
// 对应 API Key: process.env.COZE_API_KEY_PAINTING
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

// 2. 图生文配置 (Poem from Painting)
// 请在此处填入 3 个不同的工作流 ID
// 对应 API Key: process.env.COZE_API_KEY_POEM
const POEM_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'coze-poem-1': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-poem-2': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-poem-3': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', 
    APP_ID: 'REPLACE_WITH_ID',
  }
};

// 3. 古今翻译配置 (Translation)
// 对应 API Key: process.env.COZE_API_KEY_TRANS
const TRANSLATION_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'coze-trans-1': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-trans-2': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-trans-3': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', 
    APP_ID: 'REPLACE_WITH_ID',
  }
};

// 4. 白话改写古诗配置 (Rewrite)
// 对应 API Key: process.env.COZE_API_KEY_TRANS (复用翻译的 Key 或新增)
const REWRITE_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'coze-rewrite-1': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-rewrite-2': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', 
    APP_ID: 'REPLACE_WITH_ID',
  },
  'coze-rewrite-3': {
    WORKFLOW_ID: 'REPLACE_WITH_ID', 
    APP_ID: 'REPLACE_WITH_ID',
  }
};

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
// Coze Core Logic
// ============================================================================

/**
 * 运行 Coze 工作流并返回所有文本输出。
 * 不再自动提取 URL，由调用方自行处理。
 */
const runCozeWorkflow = async (
  config: { WORKFLOW_ID: string; APP_ID: string; API_KEY?: string },
  parameters: Record<string, any>
): Promise<string> => {
  if (!config.API_KEY || config.API_KEY.trim() === "") {
    throw new Error("环境变量缺失：请在根目录新建 .env 文件，并填入相应的 COZE_API_KEY。");
  }

  try {
    const response = await fetch('/coze-api/v1/workflow/stream_run', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${config.API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        workflow_id: config.WORKFLOW_ID, 
        app_id: config.APP_ID, 
        parameters: parameters 
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Coze API 报错 (${response.status}): ${errText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullTextOutput = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const dataStr = line.slice(5).trim();
            if (!dataStr || dataStr === '[DONE]') continue;
            const dataJson = JSON.parse(dataStr);
            
            // Collect text content
            if (dataJson.content) {
              fullTextOutput += dataJson.content;
            } else if (dataJson.data) {
              // 有些工作流可能直接返回 data 对象
              fullTextOutput += (typeof dataJson.data === 'string' ? dataJson.data : JSON.stringify(dataJson.data));
            }
          } catch (e) {}
        }
      }
    }

    if (!fullTextOutput) {
       // 如果 stream 没有返回 content，尝试兜底检查是否整个 response 就是 JSON
       // (通常 Coze 流式返回会有 data: 前缀，这里是防御性编程)
       return "";
    }

    return fullTextOutput;

  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("网络请求失败：请检查代理配置。");
    }
    throw error;
  }
};

/**
 * 辅助函数：从文本中提取最佳图片 URL
 */
const extractUrlFromText = (text: string): string | null => {
  if (!text) return null;
  // 1. 尝试直接匹配 URL
  const urlRegex = /https?:\/\/[^\s<>"')\]}]+/g;
  const matches = text.match(urlRegex);
  
  if (matches) {
    // 优先过滤出显然是图片的链接
    const imageExtensions = /\.(png|jpg|jpeg|webp|gif|bmp)($|\?)/i;
    const imgUrl = matches.find(url => imageExtensions.test(url));
    if (imgUrl) return imgUrl;

    // 其次找云存储链接
    const cloudUrl = matches.find(url => url.includes('tos-cn') || url.includes('googleusercontent'));
    if (cloudUrl) return cloudUrl;
    
    // 返回第一个找到的
    return matches[0];
  }

  // 2. 尝试解析 JSON
  try {
    const json = JSON.parse(text);
    const possibleUrl = json.output || json.data || json.url || json.image;
    if (typeof possibleUrl === 'string' && possibleUrl.startsWith('http')) return possibleUrl;
  } catch(e) {}
  
  return null;
};

/**
 * 辅助函数：解析 Coze 返回的 JSON 文本
 * 会自动去除 Markdown 代码块标记 ```json ... ```
 */
const parseCozeJson = <T>(text: string): T => {
  try {
    // 去除 Markdown 代码块标记
    let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    // 修复可能的非标准 JSON (例如尾部有多余字符)
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Coze JSON Parse Error:", e, "Raw Text:", text);
    throw new Error("解析 Coze 返回数据失败，请确保工作流返回的是标准 JSON 格式。");
  }
};


export const getModelsForMode = (mode: WorkflowMode): ModelOption[] => {
  return MODEL_OPTIONS[mode] || [];
};

// ============================================================================
// Service Functions (Hybrid: Coze Priority -> Gemini Fallback)
// ============================================================================

export const generatePaintingFromPoem = async (poemContent: string, modelId: string): Promise<string | null> => {
  const specificConfig = PAINTING_MODELS_CONFIG[modelId];
  if (!specificConfig) throw new Error(`未找到 ID 为 ${modelId} 的模型配置`);

  // Coze 模式
  const runConfig = { ...specificConfig, API_KEY: process.env.COZE_API_KEY_PAINTING };
  const rawOutput = await runCozeWorkflow(runConfig, { input: poemContent, prompt: poemContent });
  
  const url = extractUrlFromText(rawOutput);
  if (!url) {
    throw new Error("工作流执行成功，但未能从输出中提取到有效的图片链接。");
  }
  return url;
};

export const generatePoemFromPainting = async (base64Image: string, modelId: string): Promise<Poem | null> => {
  const cozeConfig = POEM_MODELS_CONFIG[modelId];
  
  // 1. Check if Coze Config is set (not placeholder)
  if (cozeConfig && cozeConfig.WORKFLOW_ID !== 'REPLACE_WITH_ID') {
    try {
      const rawOutput = await runCozeWorkflow(
        { ...cozeConfig, API_KEY: process.env.COZE_API_KEY_POEM }, 
        { image: base64Image } // 假设工作流接收 'image' 参数
      );
      return parseCozeJson<Poem>(rawOutput);
    } catch (e) {
      console.warn("Coze Poem Gen failed, falling back to Gemini:", e);
      // Fallback to Gemini below
    }
  }

  // 2. Gemini Fallback
  return await generatePoemFromPaintingGemini(base64Image, modelId);
};

export const translatePoem = async (poem: string, modelId: string): Promise<{ modern: string; analysis: string } | null> => {
  const cozeConfig = TRANSLATION_MODELS_CONFIG[modelId];

  if (cozeConfig && cozeConfig.WORKFLOW_ID !== 'REPLACE_WITH_ID') {
    try {
      const rawOutput = await runCozeWorkflow(
        { ...cozeConfig, API_KEY: process.env.COZE_API_KEY_TRANS },
        { input: poem } 
      );
      return parseCozeJson<{ modern: string; analysis: string }>(rawOutput);
    } catch (e) {
      console.warn("Coze Translation failed, falling back to Gemini:", e);
    }
  }

  return await translatePoemGemini(poem, modelId);
};

export const generateAncientPoemFromModern = async (modernText: string, modelId: string): Promise<Poem | null> => {
  const cozeConfig = REWRITE_MODELS_CONFIG[modelId];

  if (cozeConfig && cozeConfig.WORKFLOW_ID !== 'REPLACE_WITH_ID') {
    try {
      const rawOutput = await runCozeWorkflow(
        { ...cozeConfig, API_KEY: process.env.COZE_API_KEY_TRANS }, // 假设复用翻译 Key
        { input: modernText }
      );
      return parseCozeJson<Poem>(rawOutput);
    } catch (e) {
      console.warn("Coze Rewrite failed, falling back to Gemini:", e);
    }
  }

  return await generateAncientPoemFromModernGemini(modernText, modelId);
};

// ============================================================================
// GEMINI FALLBACKS
// ============================================================================

async function retryWithBackoff<T>(operation: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
  try { return await operation(); } catch (error: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

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

const generatePoemFromPaintingGemini = async (base64Image: string, modelId: string): Promise<Poem | null> => {
  if (!isKeyValid) throw new Error("API_KEY_MISSING");
  
  let instruction = "体裁：七言绝句。";
  if (modelId === 'coze-poem-2') instruction = "体裁：五言律诗。风格：格律严谨。";
  if (modelId === 'coze-poem-3') instruction = "体裁：宋词。风格：婉约细腻。";

  const base64Data = base64Image.split(',')[1];
  const contents = { 
    parts: [
      { inlineData: { mimeType: 'image/png', data: base64Data } },
      { text: `请为这张画作题诗。要求：${instruction}。返回 JSON 格式，包含 title, author(你取个雅号), dynasty(当代), content(数组), translation(选填), explanation(选填)。` }
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

const translatePoemGemini = async (poem: string, modelId: string): Promise<{ modern: string; analysis: string } | null> => {
  if (!isKeyValid) throw new Error("API_KEY_MISSING");
  
  let instruction = "翻译成通俗易懂的白话文，并进行简要赏析。";
  if (modelId === 'coze-trans-2') instruction = "进行深度的学术赏析，分析典故、意象与修辞。";
  if (modelId === 'coze-trans-3') instruction = "Translate into elegant English poetry (put in 'modern' field). Provide English analysis in 'analysis' field.";

  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: CREATIVE_MODEL,
      contents: `处理此诗: "${poem}"。要求: ${instruction}。返回 JSON。`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { modern: { type: Type.STRING }, analysis: { type: Type.STRING } }, required: ['modern', 'analysis'] } }
    });
  });
  return response.text ? JSON.parse(response.text) : null;
};

const generateAncientPoemFromModernGemini = async (text: string, modelId: string): Promise<Poem | null> => {
  if (!isKeyValid) throw new Error("API_KEY_MISSING");

  let instruction = "风格：唐诗（豪放）。";
  if (modelId === 'coze-rewrite-2') instruction = "风格：宋词（婉约细腻）。";
  if (modelId === 'coze-rewrite-3') instruction = "风格：诗经（四言古朴）。";

  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: CREATIVE_MODEL,
      contents: `将这段白话写成古诗: "${text}"。要求: ${instruction}。返回 JSON，包含 title, author(你取个雅号), dynasty(当代), content(数组), translation, explanation。`,
      config: { responseMimeType: "application/json", responseSchema: POEM_SCHEMA_GEMINI }
    });
  });
  return response.text ? JSON.parse(response.text) : null;
};