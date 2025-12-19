import { AIResponse } from "../types";

interface ClaudeCallParams {
  apiKey: string;
  model: string;
  endpoint?: string;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
}

/**
 * 调用Claude API (Anthropic)
 */
export async function callClaude(
  params: ClaudeCallParams,
): Promise<AIResponse> {
  const {
    apiKey,
    model,
    endpoint = "https://api.anthropic.com/v1",
    prompt,
    systemPrompt,
    temperature,
    maxTokens,
  } = params;

  try {
    const response = await fetch(`${endpoint}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt || undefined,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      throw new Error(
        `Claude API错误: ${error.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();

    return {
      content: data.content[0]?.text || "",
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Claude API调用失败");
  }
}
