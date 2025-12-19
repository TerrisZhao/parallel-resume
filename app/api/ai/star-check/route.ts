import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/config";
import { getUserAIConfig, callAI } from "@/lib/ai/client";
import {
  getStarCheckPrompt,
  getBatchStarCheckPrompt,
  STAR_CHECK_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";

const starCheckSchema = z.object({
  content: z.string().min(1, "内容不能为空").optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
  jobDescription: z.string().optional(), // 职位描述（可选）
});

/**
 * STAR 原则检测和优化接口
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
      return NextResponse.json(
        { error: "请先在设置中配置AI模型" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { content, items, jobDescription } = starCheckSchema.parse(body);

    // 判断是批量检测还是单条检测
    const isBatch = items && items.length > 0;
    const prompt = isBatch
      ? getBatchStarCheckPrompt(items, jobDescription)
      : getStarCheckPrompt(content!, jobDescription);

    // 调用AI进行STAR检测和优化
    const response = await callAI({
      config: aiConfig,
      prompt,
      systemPrompt: STAR_CHECK_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: isBatch ? 4000 : 2000, // 批量检测需要更多 tokens
    });

    // 尝试解析AI返回的JSON
    let result;
    try {
      // AI可能返回纯JSON或带markdown代码块的JSON
      const cleanedResponse = response.content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      result = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("解析AI返回结果失败:", parseError);
      // 如果解析失败，返回错误
      return NextResponse.json(
        {
          success: false,
          error: "AI返回格式错误，请重试",
          rawResponse: response.content,
        },
        { status: 500 },
      );
    }

    // 验证返回结果格式
    if (isBatch) {
      // 批量检测结果验证
      if (
        !result.results ||
        !Array.isArray(result.results) ||
        result.results.length !== items!.length
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "AI返回结果格式不正确：results 数组长度不匹配",
            rawResponse: result,
          },
          { status: 500 },
        );
      }

      // 验证每条结果格式
      for (const item of result.results) {
        if (
          !item.id ||
          !item.satisfied ||
          typeof item.satisfied.S !== "boolean" ||
          typeof item.satisfied.T !== "boolean" ||
          typeof item.satisfied.A !== "boolean" ||
          typeof item.satisfied.R !== "boolean"
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "AI返回结果格式不正确：某条结果格式错误",
              rawResponse: result,
            },
            { status: 500 },
          );
        }
      }

      return NextResponse.json({
        success: true,
        results: result.results,
        overallSatisfied: result.overallSatisfied || null,
        usage: response.usage,
      });
    } else {
      // 单条检测结果验证
      if (
        !result.satisfied ||
        typeof result.satisfied.S !== "boolean" ||
        typeof result.satisfied.T !== "boolean" ||
        typeof result.satisfied.A !== "boolean" ||
        typeof result.satisfied.R !== "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "AI返回结果格式不正确",
            rawResponse: result,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        satisfied: result.satisfied,
        improvedContent: result.improvedContent || "",
        suggestions: result.suggestions || "",
        usage: response.usage,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求数据格式错误", details: error.issues },
        { status: 400 },
      );
    }

    console.error("STAR检测失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "STAR检测失败",
      },
      { status: 500 },
    );
  }
}

