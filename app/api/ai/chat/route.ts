import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/config";
import { getUserAIConfig, callAI } from "@/lib/ai/client";

const chatRequestSchema = z.object({
  prompt: z.string().min(1, "提示词不能为空"),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().min(1).max(100000).optional().default(2000),
});

/**
 * AI聊天/调用端点
 * 用于后续功能中调用AI模型进行各种任务
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 获取用户AI配置
    const aiConfig = await getUserAIConfig(parseInt(session.user.id));

    if (!aiConfig) {
      return NextResponse.json({ error: "请先配置AI模型" }, { status: 400 });
    }

    const body = await request.json();
    const { prompt, systemPrompt, temperature, maxTokens } =
      chatRequestSchema.parse(body);

    // 调用AI
    const response = await callAI({
      config: aiConfig,
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
    });

    return NextResponse.json({
      success: true,
      response: response.content,
      usage: response.usage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求数据格式错误", details: error.issues },
        { status: 400 },
      );
    }

    console.error("AI调用失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "AI调用失败",
      },
      { status: 500 },
    );
  }
}
