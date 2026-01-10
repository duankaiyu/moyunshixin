import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Poem, SearchFilters, WorkflowMode, ModelOption } from "../types";

// ============================================================================
// Initialization
// ============================================================================

// Initialize Gemini API Client
// We assume process.env.API_KEY is available in the build environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Model Constants
const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

// ============================================================================
// Configuration & Prompts
// ============================================================================

// Definitions for UI Dropdown
const MODEL_OPTIONS: Record<WorkflowMode, ModelOption[]> = {
  [WorkflowMode.POEM_TO_PAINTING]: [
    { id: 'paint-v1', name: '水墨丹青 (标准)' },
    { id: 'paint-v2', name: '工笔重彩 (细腻)' },
    { id: 'paint-v3', name: '泼墨写意 (抽象)' },
  ],
  [WorkflowMode.PAINTING_TO_POEM]: [
    { id: 'poem-img-v1', name: '七言绝句 (经典)' },
    { id: 'poem-img-v2', name: '五言律诗 (凝练)' },
    { id: 'poem-img-v3', name: '宋词长调 (抒情)' },
  ],
  [WorkflowMode.TRANSLATION]: [
    { id: 'trans-v1', name: '通俗白话 (易懂)' },
    { id: 'trans-v2', name: '散文意译 (优美)' },
    { id: 'trans-v3', name: '学术解析 (深度)' },
  ],
  [WorkflowMode.MODERN_TO_ANCIENT]: [
    { id: 'rewrite-v1', name: '唐诗风格' },
    { id: 'rewrite-v2', name: '宋词风格' },
    { id: 'rewrite-v3', name: '元曲风格' },
  ],
};

// Prompt modifiers based on selected model ID
const STYLE_PROMPTS: Record<string, string> = {
  // Painting Styles
  'paint-v1': 'Style: Traditional Chinese Ink Wash Painting (Shui-mo hua). Composition: Balanced, elegant, emphasis on empty space (Liubai). Tone: Classical, Serene.',
  'paint-v2': 'Style: Gongbi (Meticulous style). details: Highly detailed, fine brushwork, mineral colors (blue, green, ochre). Tone: Refined, Royal.',
  'paint-v3': 'Style: Xieyi (Freehand style). Technique: Splash ink, abstract forms, bold strokes, minimal details. Tone: Expressive, Zen.',

  // Poem Formats
  'poem-img-v1': '体裁：七言绝句。要求：意境优美，格律严谨。',
  'poem-img-v2': '体裁：五言律诗。要求：对仗工整，意蕴悠长。',
  'poem-img-v3': '体裁：宋词（长调）。要求：辞藻华丽，情感细腻。',

  // Translation Styles
  'trans-v1': '风格：通俗易懂，现代化口语，适合初学者。',
  'trans-v2': '风格：优美的散文，注重保留原诗意境和美感。',
  'trans-v3': '风格：学术性，包含字词深度解析和典故说明。',

  // Rewrite Styles
  'rewrite-v1': '风格：唐诗（豪放或浪漫）。',
  'rewrite-v2': '风格：宋词（婉约或豪放）。',
  'rewrite-v3': '风格：元曲（通俗清新）。',
};

// ============================================================================
// Schemas
// ============================================================================

// Schema for Poem Object
const POEM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the poem" },
    author: { type: Type.STRING, description: "The author's name" },
    dynasty: { type: Type.STRING, description: "The dynasty (e.g., Tang, Song)" },
    content: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lines of the poem"
    },
    translation: { type: Type.STRING, description: "Modern Chinese translation" },
    explanation: { type: Type.STRING, description: "Brief analysis or appreciation" },
  },
  required: ['title', 'author', 'dynasty', 'content']
};

// Schema for Translation/Analysis Result
const TRANSLATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    modern: { type: Type.STRING, description: "Modern Chinese translation" },
    analysis: { type: Type.STRING, description: "Detailed analysis and appreciation" },
  },
  required: ['modern', 'analysis']
};

// ============================================================================
// Service Exports
// ============================================================================

export const getModelsForMode = (mode: WorkflowMode): ModelOption[] => {
  return MODEL_OPTIONS[mode] || [];
};

/**
 * Search Poems using Gemini
 */
export const searchPoems = async (filters: SearchFilters, excludeTitles: string[] = []): Promise<Poem[]> => {
  try {
    const prompt = `
      You are an expert in Chinese classical literature.
      Find 3-6 distinct Chinese classical poems that match the following criteria:
      - Keyword: ${filters.keyword || 'Any'}
      - Author: ${filters.author || 'Any'}
      - Dynasty: ${filters.dynasty || 'Any'}
      - Emotion/Theme: ${filters.emotion || 'Any'}
      
      Exclude these titles: ${excludeTitles.join(', ')}.
      
      Return the result as a JSON array of poem objects.
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: POEM_SCHEMA
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      // Handle case where model wraps array in an object
      if (Array.isArray(parsed)) {
        return parsed as Poem[];
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Look for any property that is an array
        const possibleArray = Object.values(parsed).find(val => Array.isArray(val));
        if (possibleArray) {
          return possibleArray as Poem[];
        }
      }
    }
    return [];
  } catch (error) {
    console.error("Search failed:", error);
    throw error;
  }
};

/**
 * Generate Painting from Poem (Text -> Image)
 */
export const generatePaintingFromPoem = async (poemContent: string, modelId: string): Promise<string | null> => {
  try {
    const styleInstruction = STYLE_PROMPTS[modelId] || STYLE_PROMPTS['paint-v1'];
    const prompt = `Create a traditional Chinese ink wash painting based on this poem: "${poemContent}". ${styleInstruction} No text in the image. High quality, artistic.`;

    // Note: Nano Banana models (gemini-2.5-flash-image) do NOT support responseSchema.
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: "1:1", // Square for traditional album leaf style
        }
      }
    });

    // Extract image from response parts
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

/**
 * Generate Poem from Painting (Image -> Text)
 */
export const generatePoemFromPainting = async (base64Image: string, modelId: string): Promise<Poem | null> => {
  try {
    const styleInstruction = STYLE_PROMPTS[modelId] || STYLE_PROMPTS['poem-img-v1'];
    
    // Clean base64 string
    const base64Data = base64Image.split(',')[1];
    
    const imagePart = {
      inlineData: {
        mimeType: 'image/png', // Assuming PNG or JPEG, API is flexible
        data: base64Data
      }
    };
    
    const textPart = {
      text: `Role: Chinese Poet. Task: Write a classical Chinese poem describing this image. ${styleInstruction}. Return the result in JSON format.`
    };

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: POEM_SCHEMA
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as Poem;
    }
    return null;
  } catch (error) {
    console.error("Poem generation from painting failed:", error);
    throw error;
  }
};

/**
 * Translate Poem
 */
export const translatePoem = async (poem: string, modelId: string): Promise<{ modern: string; analysis: string } | null> => {
  try {
    const styleInstruction = STYLE_PROMPTS[modelId] || STYLE_PROMPTS['trans-v1'];
    const prompt = `Translate the following classical Chinese text to modern Chinese and provide an analysis. Text: "${poem}". Requirement: ${styleInstruction}. Return JSON.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: TRANSLATION_SCHEMA
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Translation failed:", error);
    throw error;
  }
};

/**
 * Modern to Ancient Poem
 */
export const generateAncientPoemFromModern = async (modernText: string, modelId: string): Promise<Poem | null> => {
  try {
    const styleInstruction = STYLE_PROMPTS[modelId] || STYLE_PROMPTS['rewrite-v1'];
    const prompt = `Rewrite the following modern text into a classical Chinese poem. Modern text: "${modernText}". Requirement: ${styleInstruction}. Return JSON.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: POEM_SCHEMA
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as Poem;
    }
    return null;
  } catch (error) {
    console.error("Modern to Ancient generation failed:", error);
    throw error;
  }
};
