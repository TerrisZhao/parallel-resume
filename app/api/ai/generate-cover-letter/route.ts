import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

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
  resumeEducation,
  resumeProjects,
} from "@/lib/db/schema";

const generateCoverLetterSchema = z.object({
  resumeId: z.number(),
  company: z.string().min(1),
  jobDescription: z.string().min(1),
});

const COVER_LETTER_SYSTEM_PROMPT = `You are a professional career consultant specializing in writing compelling cover letters. Your cover letters are personalized, professional, and effectively highlight the candidate's relevant experience and skills.

CRITICAL: Detect the language of the job description and generate your response in THE SAME LANGUAGE. If the job description is in Chinese, write the cover letter in Chinese. If in English, write in English.`;

function getCoverLetterPrompt(
  resumeData: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    summary?: string | null;
    keySkills?: string[] | null;
  },
  workExperiences: any[],
  education: any[],
  projects: any[],
  company: string,
  jobDescription: string,
): string {
  const hasWorkExp = workExperiences && workExperiences.length > 0;
  const hasEducation = education && education.length > 0;
  const hasProjects = projects && projects.length > 0;

  return `Write a professional cover letter for the following candidate applying to ${company}.

**Candidate Information:**
- Name: ${resumeData.fullName || "Candidate"}
- Email: ${resumeData.email || "N/A"}
- Phone: ${resumeData.phone || "N/A"}
${resumeData.summary ? `- Professional Summary: ${resumeData.summary}` : ""}
${resumeData.keySkills?.length ? `- Key Skills: ${resumeData.keySkills.join(", ")}` : ""}

${
  hasWorkExp
    ? `**Work Experience:**
${workExperiences
  .map(
    (exp: any) =>
      `- ${exp.company} | ${exp.position} (${exp.startDate} - ${exp.current ? "Present" : exp.endDate})
  ${exp.description || ""}
  ${exp.responsibilities?.length ? `Responsibilities: ${exp.responsibilities.join("; ")}` : ""}`,
  )
  .join("\n")}`
    : ""
}

${
  hasEducation
    ? `**Education:**
${education.map((edu: any) => `- ${edu.degree} in ${edu.major} from ${edu.school} (${edu.startDate} - ${edu.current ? "Present" : edu.endDate})`).join("\n")}`
    : ""
}

${
  hasProjects
    ? `**Projects:**
${projects.map((proj: any) => `- ${proj.name} (${proj.role}): ${proj.description}${proj.technologies?.length ? ` | Tech: ${proj.technologies.join(", ")}` : ""}`).join("\n")}`
    : ""
}

**Target Company:** ${company}

**Job Description:**
${jobDescription}

**Cover Letter Requirements:**
1. Professional and personalized tone
2. Highlight relevant experience and skills that match the job requirements
3. Show enthusiasm for the role and company
4. Include a strong opening and compelling closing
5. Keep it concise (3-4 paragraphs)
6. Do not include placeholder text like [Your Address] - write a complete letter
7. Start with a proper greeting (e.g., "Dear Hiring Manager,")

**IMPORTANT: Write the cover letter in the same language as the job description.**

Generate ONLY the cover letter content, without any JSON formatting or additional explanation.`;
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
    const { resumeId, company, jobDescription } =
      generateCoverLetterSchema.parse(body);

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

    // 获取简历的工作经历、教育和项目
    const [workExps, educations, projectsList] = await Promise.all([
      db
        .select()
        .from(resumeWorkExperiences)
        .where(eq(resumeWorkExperiences.resumeId, resumeId))
        .orderBy(resumeWorkExperiences.order),
      db
        .select()
        .from(resumeEducation)
        .where(eq(resumeEducation.resumeId, resumeId))
        .orderBy(resumeEducation.order),
      db
        .select()
        .from(resumeProjects)
        .where(eq(resumeProjects.resumeId, resumeId))
        .orderBy(resumeProjects.order),
    ]);

    const maxTokens = 2000;
    const prompt = getCoverLetterPrompt(
      {
        fullName: resume.fullName,
        email: resume.email,
        phone: resume.phone,
        summary: resume.summary,
        keySkills: resume.keySkills,
      },
      workExps,
      educations,
      projectsList,
      company,
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
      systemPrompt: COVER_LETTER_SYSTEM_PROMPT,
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
        "Cover Letter Generation",
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
      coverLetter: response.content.trim(),
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

    console.error("Cover letter generation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate cover letter",
      },
      { status: 500 },
    );
  }
}
