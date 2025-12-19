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

  return normalizeModelIds(rawModels);
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

  return normalizeModelIds(rawModels);
}

async function listClaudeModels(
  params: ListAIModelsParams,
): Promise<string[]> {
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

  return normalizeModelIds(rawModels);
}

async function listGeminiModels(
  params: ListAIModelsParams,
): Promise<string[]> {
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

  return normalizeModelIds(rawModels);
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


