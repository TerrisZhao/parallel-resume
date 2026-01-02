import type { AIConfig, AICallParams, AIResponse } from "./types";

import { eq, and, isNull } from "drizzle-orm";

import {
  callOpenAI,
  callDeepSeek,
  callClaude,
  callGemini,
  callCustomModel,
} from "./providers";
import { getSystemConfigByMode, type AIConfigMode } from "./system-config";

import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { decryptApiKey } from "@/lib/utils/crypto";

/**
 * 从数据库获取用户的AI配置
 * 现在支持三种模式：积分模式、订阅模式、自定义配置
 */
export async function getUserAIConfig(
  userId: number,
): Promise<{ config: AIConfig; mode: AIConfigMode } | null> {
  try {
    const result = await db
      .select({
        aiConfigMode: users.aiConfigMode,
        aiProvider: users.aiProvider,
        aiModel: users.aiModel,
        aiApiKey: users.aiApiKey,
        aiApiEndpoint: users.aiApiEndpoint,
        aiCustomProviderName: users.aiCustomProviderName,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const userData = result[0];
    const mode = (userData.aiConfigMode || "custom") as AIConfigMode;

    // 如果是积分模式或订阅模式，使用系统配置
    if (mode === "credits" || mode === "subscription") {
      const systemConfig = getSystemConfigByMode(mode);

      if (!systemConfig) {
        console.error(`系统配置不可用：${mode}`);

        return null;
      }

      // 使用系统的 API Key 和 endpoint，但使用用户在数据库中选择的模型
      const userModel = userData.aiModel || "";

      if (!userModel) {
        console.error(`用户未选择模型：userId=${userId}, mode=${mode}`);

        return null;
      }

      return {
        config: {
          ...systemConfig,
          model: userModel, // 使用用户选择的模型
        },
        mode,
      };
    }

    // 自定义配置模式：从数据库读取用户配置
    if (!userData.aiProvider || !userData.aiApiKey) {
      return null;
    }

    return {
      config: {
        provider: userData.aiProvider as AIConfig["provider"],
        model: userData.aiModel || "",
        apiKey: decryptApiKey(userData.aiApiKey),
        apiEndpoint: userData.aiApiEndpoint || undefined,
        customProviderName: userData.aiCustomProviderName || undefined,
      },
      mode: "custom",
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
      prompt: "Please reply 'Connection successful'",
      systemPrompt: "You are an AI assistant. Please reply briefly.",
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
