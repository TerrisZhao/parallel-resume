import { AIResponse } from "../types";

interface OpenAICallParams {
  apiKey: string;
  model: string;
  endpoint?: string;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
}

/**
 * 调用OpenAI API
 */
export async function callOpenAI(
  params: OpenAICallParams,
): Promise<AIResponse> {
  const {
    apiKey,
    model,
    endpoint = "https://api.openai.com/v1",
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

  // 判断是否为新模型（需要使用 max_completion_tokens）
  // GPT-4o, o1 系列等新模型使用 max_completion_tokens
  const isNewModel =
    model.includes("o1") ||
    model.includes("gpt-4o") ||
    model.startsWith("o1-") ||
    model.startsWith("gpt-5");

  // 判断是否为 o1 系列模型（不支持自定义 temperature）
  const isO1Model =
    model.includes("o1") || model.startsWith("o1-") || model.includes("mini");

  const requestBody: any = {
    model,
    messages,
  };

  // o1 系列模型不支持自定义 temperature，只能使用默认值 1
  if (!isO1Model) {
    requestBody.temperature = temperature;
  }

  // 根据模型类型选择正确的参数名
  if (isNewModel) {
    requestBody.max_completion_tokens = maxTokens;
  } else {
    requestBody.max_tokens = maxTokens;
  }

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();

      throw new Error(
        `OpenAI API错误: ${error.error?.message || response.statusText}`,
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
    throw new Error("OpenAI API调用失败");
  }
}
