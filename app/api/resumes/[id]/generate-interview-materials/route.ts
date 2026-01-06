import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import {
  resumes,
  resumeWorkExperiences,
  resumeProjects,
  interviewPreparationMaterials,
} from "@/lib/db/schema";
import { getUserAIConfig, callAI } from "@/lib/ai/client";
import {
  checkCreditsBalance,
  calculateCreditsForUsage,
  consumeCredits,
} from "@/lib/credits/manager";

const SYSTEM_PROMPT = `You are a professional career coach specializing in interview preparation. Your task is to generate targeted interview preparation materials based on the candidate's resume and job description.

CRITICAL INSTRUCTIONS:
1. Detect the language of the resume content and generate ALL materials in THE SAME LANGUAGE. If the resume is in Chinese, respond in Chinese. If in English, respond in English.
2. You MUST return ONLY a valid JSON object, no additional text before or after.
3. Do NOT add any explanations, comments, or markdown formatting outside the JSON.
4. Ensure the JSON is complete and properly closed.`;

function getGenerateMaterialsPrompt(
  resume: any,
  workExperiences: any[],
  projects: any[],
  jobDescription?: string,
  language?: string,
): string {
  const isChineseLang = language === "zh";

  return `${isChineseLang ? "你是一位专业的职业顾问，专门帮助候选人准备面试。" : "You are a professional career coach specializing in interview preparation."}

${isChineseLang ? "**任务：**" : "**Task:**"}
${isChineseLang ? "基于以下简历信息和职位要求，生成全面的面试准备资料。" : "Generate comprehensive interview preparation materials based on the following resume and job description."}

${isChineseLang ? "**重要：请用中文生成所有内容**" : "**IMPORTANT: Generate all content in English**"}

${jobDescription ? `${isChineseLang ? "**目标职位要求：**" : "**Target Job Description:**"}\n${jobDescription}\n\n` : ""}

${isChineseLang ? "**个人信息：**" : "**Personal Information:**"}
${isChineseLang ? "姓名" : "Name"}: ${resume.fullName || resume.preferredName || "N/A"}
${resume.summary ? `${isChineseLang ? "职业摘要" : "Professional Summary"}: ${resume.summary}` : ""}
${resume.keySkills && resume.keySkills.length > 0 ? `${isChineseLang ? "核心技能" : "Key Skills"}: ${resume.keySkills.join(", ")}` : ""}

${
  workExperiences.length > 0
    ? `${isChineseLang ? "**工作经历：**" : "**Work Experience:**"}
${workExperiences
  .map(
    (exp: any, idx: number) => `
${idx + 1}. ${exp.company} - ${exp.position}
   ${isChineseLang ? "时间" : "Period"}: ${exp.startDate} - ${exp.current ? (isChineseLang ? "至今" : "Present") : exp.endDate}
   ${exp.description ? `${isChineseLang ? "描述" : "Description"}: ${exp.description}` : ""}
   ${exp.responsibilities && exp.responsibilities.length > 0 ? `${isChineseLang ? "职责" : "Responsibilities"}:\n   - ${exp.responsibilities.join("\n   - ")}` : ""}`,
  )
  .join("\n")}
`
    : ""
}

${
  projects.length > 0
    ? `${isChineseLang ? "**项目经历：**" : "**Project Experience:**"}
${projects
  .map(
    (proj: any, idx: number) => `
${idx + 1}. ${proj.name} - ${proj.role || (isChineseLang ? "项目成员" : "Team Member")}
   ${isChineseLang ? "时间" : "Period"}: ${proj.startDate} - ${proj.current ? (isChineseLang ? "至今" : "Present") : proj.endDate}
   ${proj.description ? `${isChineseLang ? "描述" : "Description"}: ${proj.description}` : ""}
   ${proj.technologies && proj.technologies.length > 0 ? `${isChineseLang ? "技术栈" : "Technologies"}: ${proj.technologies.join(", ")}` : ""}`,
  )
  .join("\n")}
`
    : ""
}

${isChineseLang ? "**生成要求：**" : "**Generation Requirements:**"}

${isChineseLang ? "1. **自我介绍** (self_intro)：生成至少2个不同风格的自我介绍" : "1. **Self Introduction** (self_intro): Generate at least 2 different styles of self-introductions"}
   - ${isChineseLang ? "简短版：1-2分钟版本，适合快速介绍" : "Short version: 1-2 minute version for quick introduction"}
   - ${isChineseLang ? "详细版：3-5分钟版本，包含更多细节" : "Detailed version: 3-5 minute version with more details"}

${
  workExperiences.length > 0
    ? `${isChineseLang ? "2. **工作经历面试准备** (work_experience)：为每段工作经历生成至少1个面试准备资料" : "2. **Work Experience Interview Prep** (work_experience): Generate at least 1 interview preparation material for each work experience"}
   - ${isChineseLang ? "包含可能的面试问题和建议回答" : "Include potential interview questions and suggested answers"}
   - ${isChineseLang ? "突出重点成就和贡献" : "Highlight key achievements and contributions"}`
    : ""
}

${
  projects.length > 0
    ? `${isChineseLang ? "3. **项目经历面试准备** (project)：为每个项目生成至少1个面试准备资料" : "3. **Project Experience Interview Prep** (project): Generate at least 1 interview preparation material for each project"}
   - ${isChineseLang ? "技术深度问题和回答" : "Technical depth questions and answers"}
   - ${isChineseLang ? "项目挑战和解决方案" : "Project challenges and solutions"}
   - ${isChineseLang ? "团队协作经验" : "Team collaboration experience"}`
    : ""
}

${jobDescription ? `${isChineseLang ? "4. **职位相关问题** (qa)：生成2-3个针对目标职位的常见面试问题及回答建议" : "4. **Job-Specific Q&A** (qa): Generate 2-3 common interview questions and suggested answers for the target position"}` : ""}

${isChineseLang ? "**返回格式（严格JSON）：**" : "**Return Format (strict JSON):**"}
{
  "materials": [
    {
      "category": "${isChineseLang ? "分类（self_intro, work_experience, project, qa）" : "Category (self_intro, work_experience, project, qa)"}",
      "title": "${isChineseLang ? "资料标题（清晰描述内容）" : "Material title (clear description)"}",
      "content": "${isChineseLang ? "准备内容（详细的面试准备资料）" : "Preparation content (detailed interview preparation material)"}"
    }
  ]
}

${isChineseLang ? "**重要提醒：**\n1. 确保每个材料都有清晰的标题，内容详实且针对性强\n2. 只返回上述JSON格式，不要添加任何额外的解释或文字\n3. 确保JSON格式完整，所有括号都正确闭合" : "**IMPORTANT REMINDERS:**\n1. Ensure each material has a clear title, detailed content, and strong targeting\n2. Return ONLY the JSON format above, do NOT add any extra explanations or text\n3. Ensure the JSON format is complete with all brackets properly closed"}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const resumeId = Number(id);

    // 获取简历信息
    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)));

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // 检查是否有职位描述（选填，但建议填写）
    const hasJobDescription = !!resume.jobDescription;

    // 获取工作经历
    const workExperiences = await db
      .select()
      .from(resumeWorkExperiences)
      .where(eq(resumeWorkExperiences.resumeId, resumeId))
      .orderBy(resumeWorkExperiences.order);

    // 获取项目经历
    const projects = await db
      .select()
      .from(resumeProjects)
      .where(eq(resumeProjects.resumeId, resumeId))
      .orderBy(resumeProjects.order);

    // 检查是否有足够的信息生成面试资料
    if (workExperiences.length === 0 && projects.length === 0) {
      return NextResponse.json(
        {
          error:
            resume.preferredLanguage === "zh"
              ? "简历中没有工作经历或项目经历，无法生成面试资料"
              : "No work experience or projects found in resume, cannot generate interview materials",
        },
        { status: 400 },
      );
    }

    // 获取用户AI配置
    const aiConfigData = await getUserAIConfig(userId);

    if (!aiConfigData || !aiConfigData.config) {
      return NextResponse.json(
        {
          error:
            resume.preferredLanguage === "zh"
              ? "请先在设置中配置AI模型"
              : "Please configure AI model in settings first",
        },
        { status: 400 },
      );
    }

    const { config: aiConfig, mode } = aiConfigData;

    // 增加maxTokens以容纳更多面试资料
    // 每个工作经历/项目大约需要800-1200 tokens（中文内容需要更多），加上自我介绍和Q&A
    const materialsCount =
      2 + workExperiences.length + projects.length + (hasJobDescription ? 3 : 0);
    // 中文内容通常需要更多tokens，所以基础值设为1000
    const tokensPerMaterial = resume.preferredLanguage === "zh" ? 1000 : 800;
    const maxTokens = Math.min(
      16000,
      Math.max(6000, materialsCount * tokensPerMaterial),
    );

    const prompt = getGenerateMaterialsPrompt(
      resume,
      workExperiences,
      projects,
      resume.jobDescription || undefined,
      resume.preferredLanguage || "en",
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
            error:
              resume.preferredLanguage === "zh"
                ? "积分余额不足"
                : "Insufficient credits",
            requiredCredits: estimatedCredits,
            mode: "credits",
          },
          { status: 402 },
        );
      }
    }

    // 调用AI生成面试资料
    const response = await callAI({
      config: aiConfig,
      prompt,
      systemPrompt: SYSTEM_PROMPT,
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
        resume.preferredLanguage === "zh"
          ? "生成面试资料"
          : "Generate interview materials",
      );

      if (!result.success) {
        return NextResponse.json(
          {
            error:
              result.error ||
              (resume.preferredLanguage === "zh"
                ? "积分扣除失败"
                : "Failed to consume credits"),
          },
          { status: 500 },
        );
      }

      newBalance = result.newBalance;
    }

    // 解析AI返回的JSON
    let materialsData;

    try {
      let cleanedResponse = response.content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // 尝试提取JSON对象（处理AI可能添加的额外文本）
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      materialsData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("AI response content (first 1000 chars):", response.content.substring(0, 1000));
      console.error("AI response length:", response.content.length);
      console.error("Max tokens used:", maxTokens);
      console.error("Actual tokens used:", response.usage?.totalTokens);

      return NextResponse.json(
        {
          error:
            resume.preferredLanguage === "zh"
              ? "AI返回格式错误，可能因为内容过长被截断。请稍后重试。"
              : "Invalid AI response format, possibly truncated due to length. Please try again.",
          debug: {
            responseLength: response.content.length,
            maxTokens,
            tokensUsed: response.usage?.totalTokens,
          },
        },
        { status: 500 },
      );
    }

    // 保存面试资料到数据库
    const materials = materialsData.materials || [];

    if (materials.length === 0) {
      return NextResponse.json(
        {
          error:
            resume.preferredLanguage === "zh"
              ? "未能生成面试资料"
              : "Failed to generate interview materials",
        },
        { status: 500 },
      );
    }

    // 批量插入面试资料
    const savedMaterials = [];

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      const [saved] = await db
        .insert(interviewPreparationMaterials)
        .values({
          userId,
          resumeId,
          title: material.title,
          category: material.category,
          content: material.content,
          order: i,
        })
        .returning();

      savedMaterials.push(saved);
    }

    return NextResponse.json({
      success: true,
      materials: savedMaterials,
      hasJobDescription,
      usage: response.usage,
      mode,
      ...(mode === "credits" && {
        creditsConsumed,
        creditsBalance: newBalance,
      }),
    });
  } catch (error) {
    console.error("Failed to generate interview materials:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate interview materials",
      },
      { status: 500 },
    );
  }
}
