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

const skillSuggestionsSchema = z.object({
  currentSkillGroups: z.array(
    z.object({
      id: z.string(),
      groupName: z.string(),
      skills: z.array(z.string()),
    }),
  ),
  workExperiences: z.array(z.any()).optional(),
  projects: z.array(z.any()).optional(),
  jobDescription: z.string().optional(),
  hasContext: z.boolean().optional(),
});

const SKILL_SUGGESTIONS_SYSTEM_PROMPT = `You are a professional technical recruitment consultant and resume optimization expert, specializing in skill categorization and resume optimization. Provide accurate, practical, and well-structured skill grouping suggestions.

CRITICAL: Detect the language of the user's input content (skill groups, work experience, projects, job description) and generate your response in THE SAME LANGUAGE. If the input is in Chinese, respond in Chinese. If the input is in English, respond in English.`;

function getSkillSuggestionsPrompt(
  currentSkillGroups: Array<{
    groupName: string;
    skills: string[];
  }>,
  workExperiences: any[],
  projects: any[],
  jobDescription?: string,
  hasContext?: boolean,
): string {
  const hasWorkExp = workExperiences && workExperiences.length > 0;
  const hasProjects = projects && projects.length > 0;
  const hasJobDesc = !!jobDescription;

  let optimizationGuidance = "";

  if (hasContext) {
    if (hasWorkExp && hasProjects) {
      optimizationGuidance =
        "Based on technologies mentioned in work experience and project experience, supplement potentially missing skills and optimize grouping structure.";
    } else if (hasWorkExp) {
      optimizationGuidance = "Based on responsibilities and requirements in work experience, supplement relevant skills.";
    } else if (hasProjects) {
      optimizationGuidance =
        "Based on technology stack in project experience, supplement relevant skills and tools.";
    }
  } else {
    optimizationGuidance =
      "Since work experience and project context are missing, primarily optimize existing skill grouping structure and naming to be more professional and clear. Do not add too many new skills.";
  }

  return `You are a professional technical recruitment consultant and resume optimization expert. Analyze the following resume information and optimize skill grouping.

**Current Skill Groups:**
${currentSkillGroups
  .map((group) => `【${group.groupName}】${group.skills.join(", ")}`)
  .join("\n")}

${jobDescription ? `**Target Job Description:**\n${jobDescription}\n\n` : ""}

${
  hasWorkExp
    ? `**Work Experience:**\n${workExperiences
        .map(
          (exp: any) => `- ${exp.company} | ${exp.position}
  Responsibilities: ${exp.responsibilities?.join("; ")}`,
        )
        .join("\n")}\n`
    : ""
}

${
  hasProjects
    ? `**Project Experience:**\n${projects
        .map(
          (proj: any) => `- ${proj.name}
  Tech Stack: ${proj.technologies?.join(", ")}
  Description: ${proj.description}`,
        )
        .join("\n")}\n`
    : ""
}

**Optimization Guidance:**
${optimizationGuidance}

**IMPORTANT: Detect the language of the input content above (skill groups, work experience, projects) and generate your response in THE SAME LANGUAGE. If the content is in Chinese, write group names, reasoning, and all text in Chinese. If in English, write in English.**

**Optimization Principles:**
1. **Reasonable Number of Groups**: Recommend 3-5 groups, maximum 6
2. **Clear Categorization**: Each group should have a clear theme (e.g., Programming Languages, Frameworks & Libraries, Tools & Platforms, Databases & Storage, Cloud Services & DevOps, Soft Skills)
3. **Skill Relevance**: Skills within the same group should be related
${hasContext ? "4. **Supplement Missing Skills**: Based on work experience and projects, add potentially missing skills that were actually used" : "4. **Careful Addition**: Due to lack of context, primarily optimize existing skill organization structure"}
5. **Job Matching**: ${jobDescription ? "Prioritize skills relevant to target position" : "Highlight core competencies"}
6. **Remove Redundancy**: Merge similar skills (e.g., merge React and React.js into React), remove outdated skills
7. **Priority Ordering**: Within each group, order skills by importance and proficiency, core skills first

**Return JSON Format (strict):**
{
  "optimizedGroups": [
    {
      "groupName": "Group name (concise, 3-8 characters/words, e.g., Programming Languages, Frontend Frameworks)",
      "skills": ["Skill 1", "Skill 2", "Skill 3"]
    }
  ],
  "reasoning": "Brief explanation: 1. Why grouped this way 2. What skills were added and why 3. What was deleted or merged",
  "changesCount": {
    "added": number of skills added,
    "removed": number of skills removed,
    "reorganized": number of skills reorganized
  }
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
    const {
      currentSkillGroups,
      workExperiences,
      projects,
      jobDescription,
      hasContext,
    } = skillSuggestionsSchema.parse(body);

    const maxTokens = 2000;
    const prompt = getSkillSuggestionsPrompt(
      currentSkillGroups,
      workExperiences || [],
      projects || [],
      jobDescription,
      hasContext,
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
      systemPrompt: SKILL_SUGGESTIONS_SYSTEM_PROMPT,
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
        "技能建议",
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
    let optimizationResult;

    try {
      const cleanedResponse = response.content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      optimizationResult = JSON.parse(cleanedResponse);

      // 验证返回格式
      if (
        !optimizationResult.optimizedGroups ||
        !Array.isArray(optimizationResult.optimizedGroups)
      ) {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("解析AI返回结果失败:", parseError);

      return NextResponse.json(
        {
          success: false,
          error: "AI返回格式错误，请重试",
          rawResponse: response.content,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      optimizedGroups: optimizationResult.optimizedGroups,
      reasoning: optimizationResult.reasoning || "",
      changesCount: optimizationResult.changesCount || {
        added: 0,
        removed: 0,
        reorganized: 0,
      },
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

    console.error("技能建议失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "技能推荐失败",
      },
      { status: 500 },
    );
  }
}
