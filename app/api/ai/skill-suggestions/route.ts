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
});

const SKILL_SUGGESTIONS_SYSTEM_PROMPT = `你是一位专业的技术招聘顾问和简历优化专家，擅长技能分类和简历优化。请提供准确、实用且结构良好的技能分组建议。`;

function getSkillSuggestionsPrompt(
  currentSkillGroups: Array<{
    groupName: string;
    skills: string[];
  }>,
  workExperiences: any[],
  projects: any[],
  jobDescription?: string,
): string {
  return `你是一位专业的技术招聘顾问和简历优化专家。请分析以下简历信息，优化技能分组。

当前技能分组：
${
  currentSkillGroups.length > 0
    ? currentSkillGroups
        .map((group) => `【${group.groupName}】${group.skills.join(", ")}`)
        .join("\n")
    : "无"
}

${jobDescription ? `目标职位描述：\n${jobDescription}\n\n` : ""}

工作经历：
${
  workExperiences
    ?.map(
      (exp: any) => `- ${exp.company} | ${exp.position}
  职责：${exp.responsibilities?.join("; ")}`,
    )
    .join("\n") || "无"
}

项目经验：
${
  projects
    ?.map(
      (proj: any) => `- ${proj.name}
  技术栈：${proj.technologies?.join(", ")}
  描述：${proj.description}`,
    )
    .join("\n") || "无"
}

请提供优化后的技能分组建议：

**优化原则：**
1. **合理分组数量**：建议3-5个分组，最多不超过6个
2. **清晰的分类**：每个分组应该有明确的主题（如：编程语言、框架与库、工具与平台、软技能等）
3. **技能相关性**：同一分组内的技能应该相关
4. **补充缺失技能**：基于工作经历和项目经验，添加可能遗漏的重要技能
5. **职位匹配**：${jobDescription ? "优先突出与目标职位相关的技能" : "突出核心竞争力"}
6. **去除冗余**：合并相似技能，删除过时或不重要的技能
7. **优先级排序**：每个分组内的技能按重要性排序，最重要的放在前面

返回JSON格式（严格按照此格式）：
{
  "optimizedGroups": [
    {
      "groupName": "分组名称（简洁明了，3-8个字）",
      "skills": ["技能1", "技能2", "技能3", ...]
    }
  ],
  "reasoning": "简要说明优化理由（为什么这样分组、添加了哪些技能、删除或合并了什么）",
  "changesCount": {
    "added": 0,
    "removed": 0,
    "reorganized": 0
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
    const { currentSkillGroups, workExperiences, projects, jobDescription } =
      skillSuggestionsSchema.parse(body);

    const maxTokens = 2000;
    const prompt = getSkillSuggestionsPrompt(
      currentSkillGroups,
      workExperiences || [],
      projects || [],
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
