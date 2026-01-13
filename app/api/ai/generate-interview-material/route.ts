import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { getUserAIConfig, callAI } from "@/lib/ai/client";
import {
  checkCreditsBalance,
  calculateCreditsForUsage,
  consumeCredits,
} from "@/lib/credits/manager";
import { db } from "@/lib/db/drizzle";
import {
  resumes,
  resumeWorkExperiences,
  resumeProjects,
} from "@/lib/db/schema";

const generateMaterialSchema = z.object({
  resumeId: z.number(),
  title: z.string().min(1),
  category: z.enum(["self_intro", "project", "work", "qa"]),
  itemId: z.number().optional(), // For project or work category
});

const SYSTEM_PROMPT = `You are a professional career interview coach specializing in helping candidates prepare for job interviews. Your responses should be well-structured, professional, and tailored to the candidate's experience.

CRITICAL: Detect the language of the resume content and generate your response in THE SAME LANGUAGE. If the resume is in Chinese, write in Chinese. If in English, write in English.`;

function getSelfIntroPrompt(
  resumeData: {
    fullName?: string | null;
    summary?: string | null;
    keySkills?: string[] | null;
  },
  workExperiences: any[],
  title: string,
): string {
  const hasWorkExp = workExperiences && workExperiences.length > 0;

  return `Generate a professional self-introduction for an interview based on the following candidate information.

**Title/Context:** ${title}

**Candidate Information:**
- Name: ${resumeData.fullName || "Candidate"}
${resumeData.summary ? `- Professional Summary: ${resumeData.summary}` : ""}
${resumeData.keySkills?.length ? `- Key Skills: ${resumeData.keySkills.join(", ")}` : ""}

${
  hasWorkExp
    ? `**Recent Work Experience:**
${workExperiences
  .slice(0, 3)
  .map(
    (exp: any) =>
      `- ${exp.company} | ${exp.position} (${exp.startDate} - ${exp.current ? "Present" : exp.endDate})
  ${exp.description || ""}
  ${exp.responsibilities?.length ? `Key achievements: ${exp.responsibilities.slice(0, 2).join("; ")}` : ""}`,
  )
  .join("\n")}`
    : ""
}

**Requirements - Follow the F-A-R-S-E Formula (EXACTLY 5 sentences):**
1. **F — Foundation**: State who you are and your professional identity (EXACTLY 1 sentence)
2. **A — Area of Expertise**: Highlight your core skills and the value you bring (EXACTLY 1 sentence)
3. **R — Relevant Experience**: Mention ONE specific, job-relevant experience with concrete results (EXACTLY 1 sentence)
4. **S — Strengths**: Emphasize ONE key soft skill such as collaboration, communication, or adaptability (EXACTLY 1 sentence)
5. **E — Expectation**: Briefly explain why you're interested in this opportunity (EXACTLY 1 sentence)

**Critical Guidelines:**
- Generate EXACTLY 5 sentences total, no more, no less
- Use simple, everyday words - write as if speaking naturally to someone
- Use conversational, spoken language (e.g., "I'm" instead of "I am", "I've worked" instead of "I have worked")
- Avoid complex vocabulary, jargon, or overly formal phrases
- Keep sentences short and direct
- Sound natural and human, not robotic or scripted
- Focus on outcomes, not storytelling
- Write in the same language as the resume content

Generate ONLY the self-introduction content consisting of exactly 5 sentences, using simple conversational language, without any JSON formatting, additional explanation, or extra content.`;
}

function getQAPrompt(
  resumeData: {
    fullName?: string | null;
    summary?: string | null;
    keySkills?: string[] | null;
  },
  workExperiences: any[],
  title: string,
): string {
  const hasWorkExp = workExperiences && workExperiences.length > 0;

  return `Generate a professional answer to the following interview question based on the candidate's background.

**Question:** ${title}

**Candidate Information:**
- Name: ${resumeData.fullName || "Candidate"}
${resumeData.summary ? `- Professional Summary: ${resumeData.summary}` : ""}
${resumeData.keySkills?.length ? `- Key Skills: ${resumeData.keySkills.join(", ")}` : ""}

${
  hasWorkExp
    ? `**Work Experience:**
${workExperiences
  .slice(0, 3)
  .map(
    (exp: any) =>
      `- ${exp.company} | ${exp.position} (${exp.startDate} - ${exp.current ? "Present" : exp.endDate})
  ${exp.description || ""}
  ${exp.responsibilities?.length ? `Responsibilities: ${exp.responsibilities.join("; ")}` : ""}`,
  )
  .join("\n")}`
    : ""
}

**Requirements:**
- Generate EXACTLY 1-2 sentences total
- Keep it extremely simple and direct - answer the question clearly
- Use everyday conversational language, as if speaking naturally in an interview
- Use simple words and short sentences
- If relevant, briefly mention ONE specific example or result from experience
- Sound natural and human, not robotic
- Avoid jargon, complex vocabulary, or overly formal language
- Write in the same language as the resume content

Generate ONLY the answer content consisting of 1-2 simple, conversational sentences, without any JSON formatting, additional explanation, or extra content.`;
}

function getProjectPrompt(
  resumeData: {
    fullName?: string | null;
  },
  project: any,
  title: string,
): string {
  return `Generate a professional interview answer about the following project.

**Title/Context:** ${title}

**Project Details:**
- Name: ${project.name}
- Role: ${project.role}
- Duration: ${project.startDate} - ${project.current ? "Present" : project.endDate}
- Description: ${project.description}
${project.technologies?.length ? `- Technologies: ${project.technologies.join(", ")}` : ""}

**Requirements:**
1. Use the STAR method (Situation, Task, Action, Result)
2. Highlight your specific contributions and role
3. Emphasize technical challenges and how you overcame them
4. Include measurable outcomes if possible
5. Keep it structured and easy to follow (2-3 minutes)
6. Structure: Project overview → Your role → Key challenges → Solutions → Results

**IMPORTANT: Write in the same language as the project description.**

Generate ONLY the interview preparation content, without any JSON formatting or additional explanation.`;
}

function getWorkPrompt(
  resumeData: {
    fullName?: string | null;
  },
  workExperience: any,
  title: string,
): string {
  return `Generate a professional interview answer about the following work experience.

**Title/Context:** ${title}

**Work Experience Details:**
- Company: ${workExperience.company}
- Position: ${workExperience.position}
- Duration: ${workExperience.startDate} - ${workExperience.current ? "Present" : workExperience.endDate}
${workExperience.description ? `- Overview: ${workExperience.description}` : ""}
${workExperience.responsibilities?.length ? `- Key Responsibilities: ${workExperience.responsibilities.join("; ")}` : ""}

**Requirements:**
1. Use the STAR method (Situation, Task, Action, Result)
2. Highlight key achievements and contributions
3. Emphasize your growth and learning
4. Include specific, quantifiable results when possible
5. Keep it structured and compelling (2-3 minutes)
6. Structure: Company/role context → Main responsibilities → Key achievements → Impact

**IMPORTANT: Write in the same language as the work experience description.**

Generate ONLY the interview preparation content, without any JSON formatting or additional explanation.`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // 获取用户AI配置
    const aiConfigData = await getUserAIConfig(userId);

    if (!aiConfigData || !aiConfigData.config) {
      return NextResponse.json(
        { error: "Please configure AI settings first", canUseAI: false },
        { status: 400 },
      );
    }

    const { config: aiConfig, mode } = aiConfigData;

    const body = await request.json();
    const { resumeId, title, category, itemId } =
      generateMaterialSchema.parse(body);

    // 验证简历所有权并获取简历数据
    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .limit(1);

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found or unauthorized" },
        { status: 404 },
      );
    }

    // 根据类别构建不同的prompt
    let prompt = "";

    if (category === "self_intro" || category === "qa") {
      // 获取工作经历
      const workExps = await db
        .select()
        .from(resumeWorkExperiences)
        .where(eq(resumeWorkExperiences.resumeId, resumeId))
        .orderBy(asc(resumeWorkExperiences.order));

      if (category === "self_intro") {
        prompt = getSelfIntroPrompt(
          {
            fullName: resume.fullName,
            summary: resume.summary,
            keySkills: resume.keySkills,
          },
          workExps,
          title,
        );
      } else {
        prompt = getQAPrompt(
          {
            fullName: resume.fullName,
            summary: resume.summary,
            keySkills: resume.keySkills,
          },
          workExps,
          title,
        );
      }
    } else if (category === "project") {
      // 需要指定项目
      if (!itemId) {
        return NextResponse.json(
          { error: "Project ID is required for project category" },
          { status: 400 },
        );
      }

      const [project] = await db
        .select()
        .from(resumeProjects)
        .where(
          and(
            eq(resumeProjects.id, itemId),
            eq(resumeProjects.resumeId, resumeId),
          ),
        )
        .limit(1);

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 },
        );
      }

      prompt = getProjectPrompt(
        {
          fullName: resume.fullName,
        },
        project,
        title,
      );
    } else if (category === "work") {
      // 需要指定工作经历
      if (!itemId) {
        return NextResponse.json(
          { error: "Work experience ID is required for work category" },
          { status: 400 },
        );
      }

      const [workExp] = await db
        .select()
        .from(resumeWorkExperiences)
        .where(
          and(
            eq(resumeWorkExperiences.id, itemId),
            eq(resumeWorkExperiences.resumeId, resumeId),
          ),
        )
        .limit(1);

      if (!workExp) {
        return NextResponse.json(
          { error: "Work experience not found" },
          { status: 404 },
        );
      }

      prompt = getWorkPrompt(
        {
          fullName: resume.fullName,
        },
        workExp,
        title,
      );
    }

    const maxTokens = 2000;

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
            error: "Insufficient credits",
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
        "Interview Material Generation",
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to consume credits" },
          { status: 500 },
        );
      }

      newBalance = result.newBalance;
    }

    return NextResponse.json({
      success: true,
      content: response.content.trim(),
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
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Interview material generation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate interview material",
      },
      { status: 500 },
    );
  }
}
