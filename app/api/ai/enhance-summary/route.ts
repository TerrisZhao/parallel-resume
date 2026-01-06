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

const ENHANCE_SUMMARY_SYSTEM_PROMPT = `You are a professional resume consultant specializing in writing compelling personal summaries. Provide concise, powerful professional summaries that highlight core competencies.

CRITICAL: Detect the language of the user's input content (work experience, projects, education, job description) and generate your response in THE SAME LANGUAGE. If the input is in Chinese, respond in Chinese. If the input is in English, respond in English.`;

function getEnhanceSummaryPrompt(
  workExperiences: any[],
  projects: any[],
  education: any[],
  jobDescription?: string,
): string {
  const hasWorkExp = workExperiences && workExperiences.length > 0;
  const hasProjects = projects && projects.length > 0;
  const hasEducation = education && education.length > 0;
  const hasJobDesc = !!jobDescription;

  let contextGuidance = "";

  if (hasWorkExp && hasProjects) {
    contextGuidance =
      "Highlight achievements from work experience and technical capabilities from project experience.";
  } else if (hasWorkExp) {
    contextGuidance =
      "Emphasize responsibilities and achievements from work experience.";
  } else if (hasProjects) {
    contextGuidance =
      "Focus on technical capabilities and contributions from project experience.";
  } else if (hasEducation) {
    contextGuidance =
      "Since work experience and projects are missing, emphasize educational background and academic abilities, suitable for fresh graduates or career changers.";
  }

  return `You are a professional resume consultant. Based on the following information, generate 3 different styles of professional personal summaries.

**Summary Requirements:**
1. Highlight core competencies and professional skills
2. Concise and powerful, 3-5 sentences
3. Write from the resume owner's perspective with direct description, without phrases like "I am" - directly state capabilities and experience
4. ${contextGuidance}
${hasJobDesc ? "5. Match the target job requirements" : ""}

**IMPORTANT: Detect the language of the input content below and generate summaries in THE SAME LANGUAGE. If the content is in Chinese, write summaries in Chinese. If in English, write in English.**

${jobDescription ? `**Target Job Description:**\n${jobDescription}\n\n` : ""}

${
  hasWorkExp
    ? `**Work Experience:**\n${workExperiences
        .map(
          (exp: any) =>
            `- ${exp.company} | ${exp.position} (${exp.startDate} - ${exp.endDate})\n  ${exp.responsibilities?.join("; ")}`,
        )
        .join("\n")}\n`
    : ""
}

${
  hasProjects
    ? `**Project Experience:**\n${projects.map((proj: any) => `- ${proj.name}: ${proj.description}`).join("\n")}\n`
    : ""
}

${
  hasEducation
    ? `**Education:**\n${education.map((edu: any) => `- ${edu.degree} in ${edu.major} from ${edu.school}`).join("\n")}\n`
    : ""
}

Generate the following three styles of personal summaries:
1. **Professional**: Emphasize experience and reliability, suitable for traditional industries
2. **Innovative**: Emphasize innovation and cutting-edge technology, suitable for innovative companies
3. **Technical**: Emphasize technical depth and professional skills, suitable for technical positions

**Return Format (strict JSON):**
{
  "professional": "Professional style summary content",
  "innovative": "Innovative style summary content",
  "technical": "Technical style summary content"
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
