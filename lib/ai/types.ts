/**
 * AI提供商类型
 */
export type AIProvider = "openai" | "deepseek" | "claude" | "gemini" | "custom";

/**
 * AI配置接口
 */
export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  apiEndpoint?: string;
  customProviderName?: string;
}

/**
 * AI调用参数接口
 */
export interface AICallParams {
  config: AIConfig;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * AI响应接口
 */
export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI模型定义接口
 */
export interface AIModelDefinition {
  provider: AIProvider;
  name: string;
  displayName: string;
  maxTokens: number;
  supportedFeatures: string[];
}

/**
 * 支持的模型列表
 */
export const SUPPORTED_MODELS: AIModelDefinition[] = [
  {
    provider: "openai",
    name: "gpt-4",
    displayName: "GPT-4",
    maxTokens: 8192,
    supportedFeatures: ["chat", "completion"],
  },
  {
    provider: "openai",
    name: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    maxTokens: 128000,
    supportedFeatures: ["chat", "completion"],
  },
  {
    provider: "openai",
    name: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    maxTokens: 4096,
    supportedFeatures: ["chat", "completion"],
  },
  {
    provider: "deepseek",
    name: "deepseek-chat",
    displayName: "DeepSeek Chat",
    maxTokens: 4096,
    supportedFeatures: ["chat", "completion"],
  },
  {
    provider: "deepseek",
    name: "deepseek-coder",
    displayName: "DeepSeek Coder",
    maxTokens: 4096,
    supportedFeatures: ["chat", "completion", "code"],
  },
  {
    provider: "claude",
    name: "claude-3-opus",
    displayName: "Claude 3 Opus",
    maxTokens: 200000,
    supportedFeatures: ["chat", "completion"],
  },
  {
    provider: "claude",
    name: "claude-3-sonnet",
    displayName: "Claude 3 Sonnet",
    maxTokens: 200000,
    supportedFeatures: ["chat", "completion"],
  },
  {
    provider: "claude",
    name: "claude-3-haiku",
    displayName: "Claude 3 Haiku",
    maxTokens: 200000,
    supportedFeatures: ["chat", "completion"],
  },
  {
    provider: "gemini",
    name: "gemini-pro",
    displayName: "Gemini Pro",
    maxTokens: 30720,
    supportedFeatures: ["chat", "completion"],
  },
  {
    provider: "gemini",
    name: "gemini-pro-vision",
    displayName: "Gemini Pro Vision",
    maxTokens: 30720,
    supportedFeatures: ["chat", "completion", "vision"],
  },
];
