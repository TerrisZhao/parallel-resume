import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { decryptApiKey } from "@/lib/utils/crypto";

import {
  callOpenAI,
  callDeepSeek,
  callClaude,
  callGemini,
  callCustomModel,
} from "./providers";
import type { AIConfig, AICallParams, AIResponse } from "./types";

/**
 * 从数据库获取用户的AI配置
 */
export async function getUserAIConfig(
  userId: number,
): Promise<AIConfig | null> {
  try {
    const result = await db
      .select({
        aiProvider: users.aiProvider,
        aiModel: users.aiModel,
        aiApiKey: users.aiApiKey,
        aiApiEndpoint: users.aiApiEndpoint,
        aiCustomProviderName: users.aiCustomProviderName,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (result.length === 0 || !result[0].aiProvider || !result[0].aiApiKey) {
      return null;
    }

    const config = result[0];

    return {
      provider: config.aiProvider as AIConfig["provider"],
      model: config.aiModel || "",
      apiKey: decryptApiKey(config.aiApiKey),
      apiEndpoint: config.aiApiEndpoint || undefined,
      customProviderName: config.aiCustomProviderName || undefined,
    };
  } catch (error) {
    console.error("获取AI配置失败:", error);

    return null;
  }
}

/**
 * 统一的AI调用接口
 */
export async function callAI(params: AICallParams): Promise<AIResponse> {
  const {
    config,
    prompt,
    systemPrompt,
    temperature = 0.7,
    maxTokens = 2000,
  } = params;

  try {
    switch (config.provider) {
      case "openai":
        return await callOpenAI({
          apiKey: config.apiKey,
          model: config.model,
          endpoint: config.apiEndpoint,
          prompt,
          systemPrompt,
          temperature,
          maxTokens,
        });

      case "deepseek":
        return await callDeepSeek({
          apiKey: config.apiKey,
          model: config.model,
          endpoint: config.apiEndpoint,
          prompt,
          systemPrompt,
          temperature,
          maxTokens,
        });

      case "claude":
        return await callClaude({
          apiKey: config.apiKey,
          model: config.model,
          endpoint: config.apiEndpoint,
          prompt,
          systemPrompt,
          temperature,
          maxTokens,
        });

      case "gemini":
        return await callGemini({
          apiKey: config.apiKey,
          model: config.model,
          endpoint: config.apiEndpoint,
          prompt,
          systemPrompt,
          temperature,
          maxTokens,
        });

      case "custom":
        return await callCustomModel({
          apiKey: config.apiKey,
          model: config.model,
          endpoint: config.apiEndpoint || "",
          prompt,
          systemPrompt,
          temperature,
          maxTokens,
        });

      default:
        throw new Error(`不支持的AI提供商: ${config.provider}`);
    }
  } catch (error) {
    console.error(`AI调用失败 (${config.provider}):`, error);
    throw error;
  }
}

/**
 * 测试AI连接
 */
export async function testAIConnection(
  config: Omit<AIConfig, "customProviderName">,
) {
  try {
    const response = await callAI({
      config: { ...config, customProviderName: undefined },
      prompt: "请回复'连接成功'",
      systemPrompt: "你是一个AI助手，请简短回复。",
      temperature: 0.3,
      maxTokens: 50,
    });

    return {
      success: true,
      details: {
        response: response.content,
        usage: response.usage,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
