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

const enhanceSummarySchema = z.object({
  workExperiences: z.array(z.any()).optional(),
  projects: z.array(z.any()).optional(),
  education: z.array(z.any()).optional(),
  jobDescription: z.string().optional(),
});

const ENHANCE_SUMMARY_SYSTEM_PROMPT = `你是一位专业的简历顾问，擅长撰写吸引人的个人简介。请提供简洁有力、突出核心竞争力的专业简介。`;

function getEnhanceSummaryPrompt(
  workExperiences: any[],
  projects: any[],
  education: any[],
  jobDescription?: string,
): string {
  return `你是一位专业的简历顾问。请基于以下信息，生成3个不同风格的专业个人简介（Summary）。每个简介应该：
1. 突出核心竞争力和专业技能
2. 体现工作经验的价值
3. 简洁有力，3-5句话
4. 使用第一人称或第三人称（根据简历规范）

${jobDescription ? `目标职位描述：\n${jobDescription}\n\n` : ""}

工作经历：
${
  workExperiences
    ?.map(
      (
        exp: any,
      ) => `- ${exp.company} | ${exp.position} (${exp.startDate} - ${exp.endDate})
  ${exp.responsibilities?.join("; ")}`,
    )
    .join("\n") || "无"
}

项目经验：
${projects?.map((proj: any) => `- ${proj.name}: ${proj.description}`).join("\n") || "无"}

教育背景：
${education?.map((edu: any) => `- ${edu.degree} in ${edu.major} from ${edu.school}`).join("\n") || "无"}

请生成以下三种风格的个人简介：
1. **专业型（Professional）**：强调经验和可靠性
2. **创新型（Innovative）**：强调创新能力和技术前沿
3. **技术型（Technical）**：强调技术深度和专业技能

请以JSON格式返回：
{
  "professional": "专业型简介内容",
  "innovative": "创新型简介内容",
  "technical": "技术型简介内容"
}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // 获取用户AI配置
    const aiConfigData = await getUserAIConfig(userId);

    if (!aiConfigData || !aiConfigData.config) {
      return NextResponse.json(
        { error: "请先在设置中配置AI模型" },
        { status: 400 },
      );
    }

    const { config: aiConfig, mode } = aiConfigData;

    const body = await request.json();
    const { workExperiences, projects, education, jobDescription } =
      enhanceSummarySchema.parse(body);

    const maxTokens = 1500;
    const prompt = getEnhanceSummaryPrompt(
      workExperiences || [],
      projects || [],
      education || [],
      jobDescription,
    );

    // 如果是积分模式，检查积分余额
    if (mode === "credits") {
      const estimatedCredits = await calculateCreditsForUsage(
        aiConfig.provider,
        aiConfig.model,
        {
          promptTokens: 0,
          completionTokens: maxTokens,
          totalTokens: maxTokens,
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
          { status: 402 },
        );
      }
    }

    // 调用AI
    const response = await callAI({
      config: aiConfig,
      prompt,
      systemPrompt: ENHANCE_SUMMARY_SYSTEM_PROMPT,
      temperature: 0.7,
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
        "简介增强",
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "积分扣除失败" },
          { status: 500 },
        );
      }

      newBalance = result.newBalance;
    }

    // 解析AI返回的JSON
    let summaries;

    try {
      const cleanedResponse = response.content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      summaries = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("解析AI返回结果失败:", parseError);
      // 如果解析失败，返回原始内容
      summaries = {
        professional: response.content,
        innovative: response.content,
        technical: response.content,
      };
    }

    return NextResponse.json({
      success: true,
      summaries,
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

    console.error("简介增强失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "生成简介失败",
      },
      { status: 500 },
    );
  }
}
