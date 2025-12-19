import { AIResponse } from "../types";

interface GeminiCallParams {
  apiKey: string;
  model: string;
  endpoint?: string;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
}

/**
 * 调用Google Gemini API
 */
export async function callGemini(
  params: GeminiCallParams,
): Promise<AIResponse> {
  const {
    apiKey,
    model,
    endpoint = "https://generativelanguage.googleapis.com/v1",
    prompt,
    systemPrompt,
    temperature,
    maxTokens,
  } = params;

  try {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await fetch(
      `${endpoint}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();

      throw new Error(
        `Gemini API错误: ${error.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();

    return {
      content: data.candidates[0]?.content?.parts[0]?.text || "",
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Gemini API调用失败");
  }
}
