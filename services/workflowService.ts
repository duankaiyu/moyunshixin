import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Poem, SearchFilters, WorkflowMode, ModelOption } from "../types";

// ============================================================================
// Initialization
// ============================================================================

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'MISSING_KEY' });

// Gemini Constants (Fallback / Search)
const BASIC_MODEL = 'gemini-3-flash-preview'; 
const CREATIVE_MODEL = 'gemini-3-pro-preview'; 

// ============================================================================
// COZE CONFIGURATION (Multi-User Setup)
// ============================================================================

// 1. 文生图配置 (Painting Owner) - 支持多种画幅
// 注意：这三个模型共用同一个 COZE_API_KEY_PAINTING
const PAINTING_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'coze-paint-9-16': {
    WORKFLOW_ID: '7559058997119860776', // 竖幅
    APP_ID: '7559025814764027904',
  },
  'coze-paint-4-3': {
    WORKFLOW_ID: '7559058331965718567', // 横幅
    APP_ID: '7559043000534319123',
  },
  'coze-paint-1-1': {
    WORKFLOW_ID: '7559058177272381481', // 方幅
    APP_ID: '7559035402452238390',
  }
};

// 2. 图生文配置 (Poem Owner) - 待填入
const COZE_CONFIG_POEM = {
  WORKFLOW_ID: 'REPLACE_WITH_POEM_WORKFLOW_ID', 
  APP_ID: 'REPLACE_WITH_POEM_APP_ID',
  API_KEY: process.env.COZE_API_KEY_POEM
};

// 3. 翻译/改写配置 (Translation Owner) - 待填入
const COZE_CONFIG_TRANS = {
  WORKFLOW_ID: 'REPLACE_WITH_TRANS_WORKFLOW_ID',
  APP_ID: 'REPLACE_WITH_TRANS_APP_ID',
  API_KEY: process.env.COZE_API_KEY_TRANS
};

// ============================================================================
// Configuration & Prompts
// ============================================================================

const MODEL_OPTIONS: Record<WorkflowMode, ModelOption[]> = {
  [WorkflowMode.POEM_TO_PAINTING]: [
    { id: 'coze-paint-9-16', name: '墨韵丹青 (9:16 竖幅)' },
    { id: 'coze-paint-4-3', name: '墨韵丹青 (4:3 横幅)' },
    { id: 'coze-paint-1-1', name: '墨韵丹青 (1:1 方图)' },
  ],
  [WorkflowMode.PAINTING_TO_POEM]: [
    { id: 'poem-img-v1', name: '七言绝句 (经典)' }, // Currently Gemini
    // { id: 'coze-poem', name: 'Coze 题诗助手' }, // Uncomment when Coze ID is ready
  ],
  [WorkflowMode.TRANSLATION]: [
    { id: 'trans-v1', name: '通俗白话 (易懂)' }, // Currently Gemini
    // { id: 'coze-trans', name: 'Coze 翻译官' }, // Uncomment when Coze ID is ready
  ],
  [WorkflowMode.MODERN_TO_ANCIENT]: [
    { id: 'rewrite-v1', name: '唐诗风格' },
  ],
};

const STYLE_PROMPTS: Record<string, string> = {
  // Existing Gemini prompts...
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

const checkApiKey = () => {
  if (!process.env.API_KEY || process.env.API_KEY === 'MISSING_KEY') {
    throw new Error("API_KEY_MISSING");
  }
};

// ============================================================================
// Coze Core Logic (Reusable)
// ============================================================================

/**
 * Helper: Select the best URL from a list of candidates.
 * Prioritizes direct image links (CDN) over redirect/short links.
 */
const selectBestUrl = (urls: string[]): string | null => {
  if (urls.length === 0) return null;
  
  let bestUrl = urls[0];
  let maxScore = -1;

  for (const url of urls) {
    let score = 0;
    
    // Feature 1: Image Extensions (Highest Priority)
    if (/\.(png|jpg|jpeg|webp|gif|bmp)($|\?)/i.test(url)) score += 100;
    
    // Feature 2: Known Image CDNs (High Priority)
    if (url.includes('p16-') || url.includes('tos-') || url.includes('volcengine') || url.includes('ciciai')) score += 50;
    
    // Feature 3: Short links (Low Priority)
    // These often redirect or are web pages, which don't render in <img src>
    if (url.includes('s.coze.cn')) score += 10;

    console.log(`URL Candidate: ${url} | Score: ${score}`);

    if (score > maxScore) {
      maxScore = score;
      bestUrl = url;
    }
  }
  
  return bestUrl;
};

/**
 * Universal function to call any Coze Workflow via the Vite Proxy
 */
const runCozeWorkflow = async (
  config: { WORKFLOW_ID: string; APP_ID: string; API_KEY?: string },
  parameters: Record<string, any>
): Promise<string | any> => {
  
  if (!config.API_KEY) {
    throw new Error("COZE_API_KEY_MISSING: 此功能未配置 Coze Token");
  }

  // 1. Call API
  console.log("Calling Coze Workflow:", config.WORKFLOW_ID, parameters);
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
    throw new Error(`Coze API Error: ${response.status} - ${errText}`);
  }

  if (!response.body) throw new Error("No response body from Coze API");

  // 2. Parse Stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  // Store ALL unique URLs found during the stream
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
        
        // Skip Keep-alive or Done messages
        if (!dataStr || dataStr === '[DONE]') continue;

        try {
           const dataJson = JSON.parse(dataStr);
           // Log for debug
           console.log("Coze Stream Event:", dataJson);

           // Aggressive URL Extraction
           const rawString = JSON.stringify(dataJson);
           const urlMatches = rawString.match(/https?:\/\/[^\s"']+/g);

           if (urlMatches) {
             for (const url of urlMatches) {
               // 1. Exclude Coze Debug/Editor URLs (Internal)
               if (url.includes('coze.cn/work_flow') || 
                   url.includes('coze.cn/space') || 
                   url.includes('coze.cn/project')) {
                 continue;
               }

               // 2. Clean URL (remove trailing quotes, brackets, or backslashes)
               const cleanUrl = url.replace(/[\\"')\]}]+$/, '');
               
               if (!foundUrls.has(cleanUrl)) {
                 console.log("Found URL:", cleanUrl);
                 foundUrls.add(cleanUrl);
               }
             }
           }
        } catch (e) { 
          console.warn("Chunk Parse Warning:", e); 
        }
      }
    }
  }

  // 3. Select the best URL from all found candidates
  const bestUrl = selectBestUrl(Array.from(foundUrls));
  console.log("Final Selected URL:", bestUrl);
  
  return bestUrl;
};

// ============================================================================
// Service Exports
// ============================================================================

export const getModelsForMode = (mode: WorkflowMode): ModelOption[] => {
  return MODEL_OPTIONS[mode] || [];
};

export const searchPoems = async (filters: SearchFilters, excludeTitles: string[] = []): Promise<Poem[]> => {
  checkApiKey();
  try {
    const prompt = `Find 3-6 distinct Chinese classical poems. JSON format. Criteria: ${JSON.stringify(filters)}. Exclude: ${excludeTitles.join(',')}`;
    const response = await ai.models.generateContent({
      model: BASIC_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: POEM_SCHEMA } }
    });
    return response.text ? JSON.parse(response.text) : [];
  } catch (error) {
    console.error("Search failed:", error);
    throw error;
  }
};

/**
 * 1. Text to Painting (Uses Coze - Painting Config)
 */
export const generatePaintingFromPoem = async (poemContent: string, modelId: string): Promise<string | null> => {
  try {
    // 1. 根据前端传来的 modelId 获取配置
    const specificConfig = PAINTING_MODELS_CONFIG[modelId];
    
    if (!specificConfig) {
      throw new Error(`未找到 ID 为 ${modelId} 的模型配置`);
    }

    // 2. 组合配置
    const runConfig = {
      ...specificConfig,
      API_KEY: process.env.COZE_API_KEY_PAINTING
    };

    // 3. Send parameters
    const params = { 
      input: poemContent,
      prompt: poemContent,
      content: poemContent
    };

    const result = await runCozeWorkflow(runConfig, params);
    
    if (!result) {
       console.warn("Coze workflow finished but no URL was extracted.");
       return null;
    }

    // Double check it looks like a URL
    const urlMatch = typeof result === 'string' ? result.match(/https?:\/\/[^\s<>"')]+/) : null;
    return urlMatch ? urlMatch[0] : null;

  } catch (error) {
    console.error("Coze Painting failed:", error);
    throw error;
  }
};

/**
 * 2. Painting to Poem (Hybrid: Gemini or Coze)
 */
export const generatePoemFromPainting = async (base64Image: string, modelId: string): Promise<Poem | null> => {
  checkApiKey();
  const styleInstruction = STYLE_PROMPTS[modelId] || STYLE_PROMPTS['poem-img-v1'];
  const base64Data = base64Image.split(',')[1];
  const contents = { 
    parts: [
      { inlineData: { mimeType: 'image/png', data: base64Data } },
      { text: `Role: Chinese Poet. Task: Write a poem describing this. ${styleInstruction}. Return JSON.` }
    ] 
  };
  
  const response = await ai.models.generateContent({
    model: CREATIVE_MODEL,
    contents: contents,
    config: { responseMimeType: "application/json", responseSchema: POEM_SCHEMA }
  });
  return response.text ? JSON.parse(response.text) : null;
};

/**
 * 3. Translation (Hybrid: Gemini or Coze)
 */
export const translatePoem = async (poem: string, modelId: string): Promise<{ modern: string; analysis: string } | null> => {
  checkApiKey();
  const styleInstruction = STYLE_PROMPTS[modelId] || STYLE_PROMPTS['trans-v1'];
  const prompt = `Translate to modern Chinese + Analysis. Text: "${poem}". Requirement: ${styleInstruction}. Return JSON.`;
  
  const response = await ai.models.generateContent({
    model: CREATIVE_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: TRANSLATION_SCHEMA }
  });
  return response.text ? JSON.parse(response.text) : null;
};

export const generateAncientPoemFromModern = async (modernText: string, modelId: string): Promise<Poem | null> => {
  checkApiKey();
  const styleInstruction = STYLE_PROMPTS[modelId] || STYLE_PROMPTS['rewrite-v1'];
  const prompt = `Rewrite modern text to classical poem. Text: "${modernText}". Requirement: ${styleInstruction}. Return JSON.`;
  
  const response = await ai.models.generateContent({
    model: CREATIVE_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: POEM_SCHEMA }
  });
  return response.text ? JSON.parse(response.text) : null;
};