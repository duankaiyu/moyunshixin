import { Poem, WorkflowMode, ModelOption } from "../types";

// ============================================================================
// COZE CONFIGURATION
// ============================================================================

// 1. 文生图配置 (Painting)
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
const POEM_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'painting_to_prose__': {
    WORKFLOW_ID: '7559032378917126144', 
    APP_ID: '7558880828160639014',
  },
  'painting_to_prose_1': {
    WORKFLOW_ID: '7558533197300351027', 
    APP_ID: '7558418710018031651',
  },
  'painting_to_prose': {
    WORKFLOW_ID: '7553617651843629102', 
    APP_ID: '7553575067091861542',
  }
};

// 3. 古今翻译配置 (Translation)
const TRANSLATION_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'coze-trans-DS': {
    WORKFLOW_ID: '7553544502797123603',
    APP_ID: '7553481417800712202',
  },
  'coze-trans-KIMI': {
    WORKFLOW_ID: '7553550423253254170',
    APP_ID: '7553503663458304046',
  },
  'coze-trans-DB': {
    WORKFLOW_ID: '7553548736765689899',
    APP_ID: '7553498798577401875',
  }
};

// 4. 白话改写古诗配置 (Rewrite)
const REWRITE_MODELS_CONFIG: Record<string, { WORKFLOW_ID: string; APP_ID: string }> = {
  'coze-rewrite-DS': {
    WORKFLOW_ID: '7553544502797123603',
    APP_ID: '7553481417800712202',
  },
  'coze-rewrite-KIMI': {
    WORKFLOW_ID: '7553550423253254170',
    APP_ID: '7553503663458304046',
  },
  'coze-rewrite-DB': {
    WORKFLOW_ID: '7553548736765689899',
    APP_ID: '7553498798577401875',
  }
};

const MODEL_OPTIONS: Record<WorkflowMode, ModelOption[]> = {
  [WorkflowMode.POEM_TO_PAINTING]: [
    { id: 'coze-paint-9-16', name: '墨韵丹青 (9:16 竖幅)' },
    { id: 'coze-paint-4-3', name: '墨韵丹青 (4:3 横幅)' },
    { id: 'coze-paint-1-1', name: '墨韵丹青 (1:1 方图)' },
  ],
  [WorkflowMode.PAINTING_TO_POEM]: [
    { id: 'painting_to_prose__', name: '丹青晓言' }, 
    { id: 'painting_to_prose_1', name: '墨卷解语' },
    { id: 'painting_to_prose', name: '墨语卷心' },
  ],
  [WorkflowMode.TRANSLATION]: [
    { id: 'coze-trans-DS', name: '诗映凡言（DeepSeek-V3.1）' },
    { id: 'coze-trans-KIMI', name: '诗映凡言（KIMI·K2）' },
    { id: 'coze-trans-DB', name: '诗映凡言（豆包·1.6）' },
  ],
  [WorkflowMode.MODERN_TO_ANCIENT]: [
    { id: 'coze-rewrite-DS', name: '语化清辞（DeepSeek-V3.1）' },
    { id: 'coze-rewrite-KIMI', name: '语化清辞（KIMI·K2）' },
    { id: 'coze-rewrite-DB', name: '语化清辞（豆包·1.6）' },
  ],
};

// ============================================================================
// Coze Core Logic
// ============================================================================

const runCozeWorkflow = async (
  config: { WORKFLOW_ID: string; APP_ID: string; API_KEY?: string },
  parameters: Record<string, any>
): Promise<string> => {
  if (!config.API_KEY || config.API_KEY.trim() === "") throw new Error("请检查 COZE_API_KEY。");

  try {
    const response = await fetch('/coze-api/v1/workflow/stream_run', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: config.WORKFLOW_ID, parameters: parameters })
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errJson = await response.json();
      throw new Error(`Coze API 拒绝执行: ${JSON.stringify(errJson)}`);
    }
    if (!response.ok) throw new Error(`网络或鉴权错误 (${response.status})`);

    const reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullTextOutput = '';
    let buffer = '';
    let currentEvent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; 

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('event:')) {
           currentEvent = trimmedLine.slice(6).trim();
           continue;
        }
        if (trimmedLine.startsWith('data:')) {
          try {
            const dataStr = trimmedLine.slice(5).trim();
            if (!dataStr || dataStr === '[DONE]') continue;
            const dataJson = JSON.parse(dataStr);
            
            if (currentEvent === 'Error' || (dataJson.code !== undefined && dataJson.code !== 0)) {
               throw new Error(`工作流执行错误: ${dataJson.msg || dataJson.error_msg}`);
            }

            if (currentEvent === 'Message' && dataJson.content && typeof dataJson.content === 'string') {
               fullTextOutput += dataJson.content;
            } else if (currentEvent === 'WorkflowFinish' && dataJson.data) {
               try {
                 const finishData = JSON.parse(dataJson.data);
                 if (finishData.output && !fullTextOutput.includes(finishData.output)) {
                    fullTextOutput = finishData.output;
                 }
               } catch(e) {}
            }
          } catch (e) {
             if (e instanceof Error && e.message.includes('工作流执行错误')) throw e;
          }
        }
      }
    }
    return fullTextOutput || "";
  } catch (error: any) {
    if (error.name === 'TypeError') throw new Error("网络请求失败，请检查连通性。");
    throw error;
  }
};

const extractUrlFromText = (text: string): string | null => {
  if (!text) return null;
  const matches = text.match(/https?:\/\/[^\s<>"')\]}]+/g);
  if (matches) {
    const imgUrl = matches.find(url => /\.(png|jpg|jpeg|webp|gif|bmp)($|\?)/i.test(url));
    return imgUrl || matches[0];
  }
  try {
    const json = JSON.parse(text);
    const possibleUrl = json.output || json.data || json.url || json.image;
    if (typeof possibleUrl === 'string' && possibleUrl.startsWith('http')) return possibleUrl;
  } catch(e) {}
  return null;
};

/**
 * 💡 终极修复：智能容错 JSON 解析器
 * 如果大模型发神经给了一大段散文，它会自动将其打包成合法的对象格式！不会再崩溃！
 */
const parseCozeJson = <T>(text: string, isPoem: boolean = true): T => {
  if (!text || text.trim() === '') throw new Error("工作流未返回任何内容。");

  try {
    let cleanText = text.trim();
    try {
      const wrapper = JSON.parse(cleanText);
      if (wrapper && typeof wrapper.output === 'string') cleanText = wrapper.output; 
    } catch(e) {}

    cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      const parsed = JSON.parse(cleanText.substring(firstBrace, lastBrace + 1));
      // 只有解析出我们需要的字段，才认为它是合法的 JSON
      if (parsed.content || parsed.modern || parsed.title) {
        return parsed as T;
      }
    }
    throw new Error("No valid fields found");
  } catch (e) {
    // 🛡️ 智能容错兜底：把大模型写的散文自动拼成诗词/翻译卡片所需的数据结构
    console.warn("大模型输出了纯文本，已启动智能排版包装。原文:", text);
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (isPoem) {
      return {
        title: "画意赏析",
        author: "墨韵智作",
        dynasty: "当世",
        content: lines, // 将长文分段显示在内容区
        explanation: "注：大模型按散文格式输出了深度赏析，已为您自动排版。"
      } as unknown as T;
    } else {
      return {
        modern: text,
        analysis: ""
      } as unknown as T;
    }
  }
};

export const getModelsForMode = (mode: WorkflowMode): ModelOption[] => MODEL_OPTIONS[mode] || [];

// ============================================================================
// Service Functions
// ============================================================================

const uploadImageToCoze = async (base64Image: string, apiKey: string): Promise<string> => {
  const arr = base64Image.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  const file = new File([u8arr], 'upload_image.jpg', { type: mime });

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/coze-api/v1/files/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData
  });

  if (!response.ok) throw new Error(`图片上传至 Coze 失败: ${await response.text()}`);
  const json = await response.json();
  if (json.code !== 0 || !json.data?.id) throw new Error(`Coze 图片上传异常: ${JSON.stringify(json)}`);

  return json.data.id;
};

export const generatePaintingFromPoem = async (poemContent: string, modelId: string): Promise<string | null> => {
  const config = PAINTING_MODELS_CONFIG[modelId];
  if (!config) throw new Error(`未找到模型配置`);

  const rawOutput = await runCozeWorkflow({ ...config, API_KEY: process.env.COZE_API_KEY_PAINTING }, { input: poemContent, prompt: poemContent });
  const url = extractUrlFromText(rawOutput);
  if (!url) throw new Error("工作流执行成功，但未提取到图片链接。");
  return url;
};

export const generatePoemFromPainting = async (base64Image: string, modelId: string): Promise<Poem | null> => {
  const config = POEM_MODELS_CONFIG[modelId];
  if (!config) throw new Error(`未找到模型配置`);
  const apiKey = process.env.COZE_API_KEY_POEM;
  if (!apiKey) throw new Error("环境变量缺失");

  console.log("1. 上传图片...");
  const fileId = await uploadImageToCoze(base64Image, apiKey);
  console.log("2. 运行题诗工作流...");

  // 我们已经确认格式 A 是能跑通 API 的，现在只管解析容错即可
  try {
    const rawOutput = await runCozeWorkflow(
      { ...config, API_KEY: apiKey }, 
      { input: JSON.stringify({ file_id: String(fileId) }) } 
    );
    // 💡 传入 true，表示这是诗词生成，交给智能容错器处理
    return parseCozeJson<Poem>(rawOutput, true);
  } catch (apiError: any) {
    // 只有在 API 真挂了（比如网络断了）才会走到这，此时抛出报错
    throw new Error(`请求大模型失败: ${apiError.message}`);
  }
};

export const translatePoem = async (poem: string, modelId: string): Promise<{ modern: string; analysis: string } | null> => {
  const config = TRANSLATION_MODELS_CONFIG[modelId];
  if (!config) throw new Error(`未找到模型配置`);

  const rawOutput = await runCozeWorkflow({ ...config, API_KEY: process.env.COZE_API_KEY_TRANS }, { input: poem });
  // 💡 传入 false，告诉容错器这是翻译模式
  return parseCozeJson<{ modern: string; analysis: string }>(rawOutput, false);
};

export const generateAncientPoemFromModern = async (modernText: string, modelId: string): Promise<Poem | null> => {
  const config = REWRITE_MODELS_CONFIG[modelId];
  if (!config) throw new Error(`未找到模型配置`);

  const rawOutput = await runCozeWorkflow({ ...config, API_KEY: process.env.COZE_API_KEY_TRANS }, { input: modernText });
  return parseCozeJson<Poem>(rawOutput, true);
};