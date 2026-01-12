export enum WorkflowMode {
  POEM_TO_PAINTING = 'POEM_TO_PAINTING',
  PAINTING_TO_POEM = 'PAINTING_TO_POEM',
  TRANSLATION = 'TRANSLATION',
  MODERN_TO_ANCIENT = 'MODERN_TO_ANCIENT'
}

export enum AppSection {
  HOME = 'HOME',
  WORKBENCH = 'WORKBENCH'
}

export interface ModelOption {
  id: string;
  name: string;
}

export interface Poem {
  title: string;
  author: string;
  dynasty: string;
  content: string[]; // Array of lines
  translation?: string; // Modern vernacular
  explanation?: string; // Brief analysis
}

export interface GenerationResult {
  type: 'image' | 'text' | 'comparison';
  data: string | Poem | { original: Poem; translated: string };
  loading: boolean;
}

// User Authentication Types
export interface User {
  username: string;
  nickname: string;
  createdAt: number;
}

// History/Collection Types
export interface HistoryItem {
  id: string;
  userId: string;
  timestamp: number;
  mode: WorkflowMode;
  input: string; // The prompt or image used
  result: any; // The generation result
}