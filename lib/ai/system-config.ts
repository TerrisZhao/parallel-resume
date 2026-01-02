import type { AIConfig } from "./types";

/**
 * AI 配置模式类型
 */
export type AIConfigMode = "credits" | "subscription" | "custom";

/**
 * 获取通用的系统 AI 配置（积分和订阅模式共用）
 * 注意：这里只返回 provider, apiKey, apiEndpoint
 * model 字段由用户在前端选择，保存在数据库中
 */
function getCommonSystemConfig(): Omit<AIConfig, "model"> | null {
  const provider = process.env.COMMON_AI_PROVIDER;
  const apiKey = process.env.COMMON_AI_API_KEY;
  const apiEndpoint = process.env.COMMON_AI_API_ENDPOINT;

  if (!provider || !apiKey) {
    console.warn(
      "通用 AI 配置不完整，请检查环境变量 COMMON_AI_PROVIDER 和 COMMON_AI_API_KEY",
    );

    return null;
  }

  return {
    provider: provider as AIConfig["provider"],
    apiKey,
    apiEndpoint: apiEndpoint || undefined,
  };
}

/**
 * 获取积分模式的系统 AI 配置
 * 使用通用配置，model 字段为空（由用户选择）
 */
export function getCreditsSystemConfig(): AIConfig | null {
  const commonConfig = getCommonSystemConfig();

  if (!commonConfig) {
    return null;
  }

  return {
    ...commonConfig,
    model: "", // 模型由用户选择
  };
}

/**
 * 获取订阅模式的系统 AI 配置
 * 使用通用配置，model 字段为空（由用户选择）
 */
export function getSubscriptionSystemConfig(): AIConfig | null {
  const commonConfig = getCommonSystemConfig();

  if (!commonConfig) {
    return null;
  }

  return {
    ...commonConfig,
    model: "", // 模型由用户选择
  };
}

/**
 * 根据配置模式获取系统 AI 配置
 */
export function getSystemConfigByMode(mode: AIConfigMode): AIConfig | null {
  switch (mode) {
    case "credits":
      return getCreditsSystemConfig();
    case "subscription":
      return getSubscriptionSystemConfig();
    default:
      return null;
  }
}
