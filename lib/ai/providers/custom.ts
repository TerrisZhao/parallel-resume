import { AIResponse } from "../types";

interface CustomModelCallParams {
  apiKey: string;
  model: string;
  endpoint: string;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
}

/**
 * 调用自定义模型API
 * 默认使用OpenAI兼容的格式
 */
export async function callCustomModel(
  params: CustomModelCallParams,
): Promise<AIResponse> {
  const {
    apiKey,
    model,
    endpoint,
    prompt,
    systemPrompt,
    temperature,
    maxTokens,
  } = params;

  if (!endpoint) {
    throw new Error("自定义模型需要提供API端点地址");
  }

  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: response.statusText },
      }));

      throw new Error(
        `自定义模型API错误: ${error.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();

    return {
      content: data.choices?.[0]?.message?.content || data.response || "",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("自定义模型API调用失败");
  }
}
