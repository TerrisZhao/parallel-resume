import { AIResponse } from "../types";

interface DeepSeekCallParams {
  apiKey: string;
  model: string;
  endpoint?: string;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
}

/**
 * 调用DeepSeek API
 * DeepSeek API与OpenAI API兼容
 */
export async function callDeepSeek(
  params: DeepSeekCallParams,
): Promise<AIResponse> {
  const {
    apiKey,
    model,
    endpoint = "https://api.deepseek.com/v1",
    prompt,
    systemPrompt,
    temperature,
    maxTokens,
  } = params;

  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
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
      const error = await response.json();

      throw new Error(
        `DeepSeek API错误: ${error.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || "",
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
    throw new Error("DeepSeek API调用失败");
  }
}
