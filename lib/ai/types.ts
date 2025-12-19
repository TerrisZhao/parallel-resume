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
