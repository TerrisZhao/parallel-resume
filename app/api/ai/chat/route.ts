import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/config";
import { getUserAIConfig, callAI } from "@/lib/ai/client";
import {
  checkCreditsBalance,
  calculateCreditsForUsage,
  consumeCredits,
} from "@/lib/credits/manager";

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

    const userId = parseInt(session.user.id);

    // 获取用户AI配置（现在返回 config 和 mode）
    const aiConfigData = await getUserAIConfig(userId);

    if (!aiConfigData) {
      return NextResponse.json({ error: "请先配置AI模型" }, { status: 400 });
    }

    const { config: aiConfig, mode } = aiConfigData;

    const body = await request.json();
    const { prompt, systemPrompt, temperature, maxTokens } =
      chatRequestSchema.parse(body);

    // 如果是积分模式，检查积分余额（预估）
    if (mode === "credits") {
      // 预估消耗（按最大 token 计算）
      const estimatedCredits = await calculateCreditsForUsage(
        aiConfig.provider,
        aiConfig.model,
        {
          promptTokens: 0,
          completionTokens: maxTokens || 2000,
          totalTokens: maxTokens || 2000,
        },
      );

      const hasEnoughCredits = await checkCreditsBalance(
        userId,
        estimatedCredits,
      );

      if (!hasEnoughCredits) {
        return NextResponse.json(
          {
            error: "积分余额不足",
            requiredCredits: estimatedCredits,
            mode: "credits",
          },
          { status: 402 }, // 402 Payment Required
        );
      }
    }

    // 调用AI
    const response = await callAI({
      config: aiConfig,
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
    });

    // 如果是积分模式，扣除积分
    let creditsConsumed = 0;
    let newBalance = 0;

    if (mode === "credits") {
      creditsConsumed = await calculateCreditsForUsage(
        aiConfig.provider,
        aiConfig.model,
        response.usage,
      );

      const result = await consumeCredits(
        userId,
        creditsConsumed,
        aiConfig.provider,
        aiConfig.model,
        response.usage,
        `AI 调用 - ${prompt.substring(0, 50)}...`,
      );

      if (!result.success) {
        // 理论上不应该发生，因为已经预检查了
        return NextResponse.json(
          { error: result.error || "积分扣除失败" },
          { status: 500 },
        );
      }

      newBalance = result.newBalance;
    }

    return NextResponse.json({
      success: true,
      response: response.content,
      usage: response.usage,
      mode,
      ...(mode === "credits" && {
        creditsConsumed,
        creditsBalance: newBalance,
      }),
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
