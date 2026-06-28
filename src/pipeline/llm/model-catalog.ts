import { ApiProvider } from '@/generated/prisma/enums';

export interface ModelEntry {
  id: string;
  name: string;
  provider: ApiProvider;
  description: string;
}

export const DEFAULT_MODEL_ID = 'gemini-2.0-flash';

export const MODEL_CATALOG: ModelEntry[] = [
  // Google
  { id: 'gemini-2.5-pro-preview-06-05',   name: 'Gemini 2.5 Pro',    provider: ApiProvider.google,    description: 'Most capable, best reasoning' },
  { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash',  provider: ApiProvider.google,    description: 'Fast with strong reasoning' },
  { id: 'gemini-2.0-flash',               name: 'Gemini 2.0 Flash',  provider: ApiProvider.google,    description: 'Fast, cost-efficient (default)' },
  { id: 'gemini-1.5-pro',                 name: 'Gemini 1.5 Pro',    provider: ApiProvider.google,    description: 'Large context, reliable' },
  { id: 'gemini-1.5-flash',               name: 'Gemini 1.5 Flash',  provider: ApiProvider.google,    description: 'Lightweight' },
  // Anthropic
  { id: 'claude-opus-4-8',                name: 'Claude Opus 4',     provider: ApiProvider.anthropic, description: 'Most intelligent' },
  { id: 'claude-sonnet-4-6',              name: 'Claude Sonnet 4',   provider: ApiProvider.anthropic, description: 'Balanced performance' },
  { id: 'claude-haiku-4-5-20251001',      name: 'Claude Haiku 4',    provider: ApiProvider.anthropic, description: 'Fast & affordable' },
  { id: 'claude-3-5-sonnet-20241022',     name: 'Claude 3.5 Sonnet', provider: ApiProvider.anthropic, description: 'Previous gen best' },
  { id: 'claude-3-5-haiku-20241022',      name: 'Claude 3.5 Haiku',  provider: ApiProvider.anthropic, description: 'Previous gen fast' },
  // OpenAI
  { id: 'gpt-4o',      name: 'GPT-4o',      provider: ApiProvider.openai, description: 'Most capable' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: ApiProvider.openai, description: 'Fast & affordable' },
  { id: 'o3-mini',     name: 'o3 Mini',     provider: ApiProvider.openai, description: 'Reasoning model' },
  { id: 'o1-mini',     name: 'o1 Mini',     provider: ApiProvider.openai, description: 'Reasoning model' },
  // Ollama (local — no API key required)
  { id: 'llama3.2',   name: 'Llama 3.2 3B',  provider: ApiProvider.ollama, description: 'Fast, runs locally via Ollama' },
  { id: 'llama3.1',   name: 'Llama 3.1 8B',  provider: ApiProvider.ollama, description: 'Balanced local model' },
  { id: 'qwen2.5',    name: 'Qwen 2.5 7B',   provider: ApiProvider.ollama, description: 'Strong multilingual model' },
  { id: 'mistral',    name: 'Mistral 7B',     provider: ApiProvider.ollama, description: 'Efficient and capable' },
  { id: 'phi4',       name: 'Phi-4 14B',      provider: ApiProvider.ollama, description: 'Microsoft reasoning model' },
  { id: 'gemma3:4b',  name: 'Gemma 3 4B',     provider: ApiProvider.ollama, description: 'Google compact local model' },
];

export const findModel = (id: string): ModelEntry | undefined =>
  MODEL_CATALOG.find((m) => m.id === id);

export const defaultModelForProvider = (provider: ApiProvider): string =>
  MODEL_CATALOG.find((m) => m.provider === provider)?.id ?? DEFAULT_MODEL_ID;
