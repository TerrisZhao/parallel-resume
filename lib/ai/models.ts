import type { AIProvider } from "./types";

export interface ListAIModelsParams {
  provider: AIProvider;
  apiKey: string;
  apiEndpoint?: string;
}

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, "");

/**
 * 统一获取各个提供商的模型列表
 */
export async function listAIModels(
  params: ListAIModelsParams,
): Promise<string[]> {
  const { provider } = params;

  switch (provider) {
    case "openai":
      return listOpenAIModels(params);
    case "deepseek":
      return listDeepSeekModels(params);
    case "claude":
      return listClaudeModels(params);
    case "gemini":
      return listGeminiModels(params);
    case "custom":
      // 自定义模型通常由用户自己填写，这里返回空列表即可
      return [];
    default:
      // TypeScript 保护，理论上不会走到这里
      throw new Error(`不支持的AI提供商: ${provider}`);
  }
}

async function listOpenAIModels(params: ListAIModelsParams): Promise<string[]> {
  const base =
    params.apiEndpoint && params.apiEndpoint.length > 0
      ? trimTrailingSlash(params.apiEndpoint)
      : "https://api.openai.com/v1";

  const response = await fetch(`${base}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await safeJson(response);

    throw new Error(
      `OpenAI 模型列表获取失败: ${
        (error as any)?.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  const rawModels = (data as any)?.data || (data as any)?.models || [];

  const allModels = normalizeModelIds(rawModels);

  return filterResumeOptimizationModels(allModels, "openai");
}

async function listDeepSeekModels(
  params: ListAIModelsParams,
): Promise<string[]> {
  const base =
    params.apiEndpoint && params.apiEndpoint.length > 0
      ? trimTrailingSlash(params.apiEndpoint)
      : "https://api.deepseek.com/v1";

  const response = await fetch(`${base}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await safeJson(response);

    throw new Error(
      `DeepSeek 模型列表获取失败: ${
        (error as any)?.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  const rawModels = (data as any)?.data || (data as any)?.models || [];

  const allModels = normalizeModelIds(rawModels);

  return filterResumeOptimizationModels(allModels, "deepseek");
}

async function listClaudeModels(params: ListAIModelsParams): Promise<string[]> {
  const base =
    params.apiEndpoint && params.apiEndpoint.length > 0
      ? trimTrailingSlash(params.apiEndpoint)
      : "https://api.anthropic.com/v1";

  const response = await fetch(`${base}/models`, {
    method: "GET",
    headers: {
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
  });

  if (!response.ok) {
    const error = await safeJson(response);

    throw new Error(
      `Claude 模型列表获取失败: ${
        (error as any)?.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  const rawModels = (data as any)?.data || (data as any)?.models || [];

  const allModels = normalizeModelIds(rawModels);

  return filterResumeOptimizationModels(allModels, "claude");
}

async function listGeminiModels(params: ListAIModelsParams): Promise<string[]> {
  const base =
    params.apiEndpoint && params.apiEndpoint.length > 0
      ? trimTrailingSlash(params.apiEndpoint)
      : "https://generativelanguage.googleapis.com/v1";

  const response = await fetch(
    `${base}/models?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await safeJson(response);

    throw new Error(
      `Gemini 模型列表获取失败: ${
        (error as any)?.error?.message || response.statusText
      }`,
    );
  }

  const data = await response.json();
  const rawModels =
    (data as any)?.models || (data as any)?.data || (data as any) || [];

  const allModels = normalizeModelIds(rawModels);

  return filterResumeOptimizationModels(allModels, "gemini");
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeModelIds(rawModels: any[]): string[] {
  if (!Array.isArray(rawModels)) {
    return [];
  }

  const ids = rawModels
    .map((m) => (typeof m === "string" ? m : m.id || m.name))
    .filter((id): id is string => Boolean(id));

  // 去重 + 排序，避免前端展示杂乱
  return Array.from(new Set(ids)).sort();
}

/**
 * 筛选适合简历优化的模型
 * 简历优化需要文本生成和理解能力，排除 embedding、moderation、whisper 等专用模型
 */
function filterResumeOptimizationModels(
  models: string[],
  provider: AIProvider,
): string[] {
  return models.filter((model) => {
    const modelLower = model.toLowerCase();

    switch (provider) {
      case "openai":
        // 只保留 GPT-4 和 GPT-3.5 Turbo 系列（chat/completion 模型）
        // 排除: embedding, moderation, whisper, davinci-002, text-embedding, ada, babbage, curie, davinci
        return (
          (modelLower.startsWith("gpt-5") ||
            modelLower.startsWith("gpt-4") ||
            modelLower.startsWith("gpt-3.5-turbo")) &&
          !modelLower.includes("embedding") &&
          !modelLower.includes("moderation") &&
          !modelLower.includes("audio") &&
          !modelLower.includes("codex") &&
          !modelLower.includes("tts") &&
          !modelLower.includes("search") &&
          !modelLower.includes("transcribe") &&
          !modelLower.includes("chat") &&
          !modelLower.includes("whisper") &&
          !modelLower.includes("preview") &&
          !modelLower.includes("davinci-002") &&
          !modelLower.includes("instruct")
        );

      case "deepseek":
        // 只保留 chat 和 coder 模型
        return modelLower.includes("deepseek-chat");

      case "claude":
        // 只保留 Claude 3 和 Claude 2 系列（chat 模型）
        // 排除: claude-instant-1（旧版本）
        return (
          modelLower.startsWith("claude-4") || modelLower.startsWith("claude-3")
        );

      case "gemini":
        // 只保留 gemini-pro 和 gemini-1.5 系列（生成模型）
        // 排除: embedding, embedding-001, embedding-002 等
        return (
          (modelLower.startsWith("gemini-pro") ||
            modelLower.startsWith("gemini-2.5")) &&
          !modelLower.includes("embedding")
        );

      case "custom":
        // 自定义模型不过滤，全部返回
        return true;

      default:
        return false;
    }
  });
}
