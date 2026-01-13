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

const SYSTEM_PROMPT = `You are a job candidate answering questions in a real interview.

Your answers must sound like natural spoken language, not written text.
Keep answers short, clear, and realistic.
Do NOT sound like a coach, article, or textbook.

CRITICAL:
- Detect the language of the resume content and respond in the SAME language.
- Speak like a real person in an interview.
- Prefer simple words and short sentences.
`;

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

  return `Generate a short self-introduction for a real job interview.

Context: ${title}

Candidate info:
- Name: ${resumeData.fullName || "Candidate"}
${resumeData.summary ? `- Background: ${resumeData.summary}` : ""}
${resumeData.keySkills?.length ? `- Skills: ${resumeData.keySkills.join(", ")}` : ""}

${hasWorkExp ? `
Recent experience (for reference only):
${workExperiences.slice(0, 2).map(exp =>
`- ${exp.company}, ${exp.position}: ${exp.description || ""}`
).join("\n")}
` : ""}

Rules:
- Speak as if you are answering in a real interview
- Use 3–4 short sentences only
- About 20–30 seconds when spoken
- Simple, spoken language (use "I'm", "I've")
- Focus on what you do and what you're good at
- No formal structure, no bullet points, no frameworks

Generate ONLY the spoken self-introduction.`;
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

  return `Answer the following interview question as if you are speaking naturally.

Question: ${title}

Background (for reference only):
${resumeData.summary || ""}
${resumeData.keySkills?.length ? resumeData.keySkills.join(", ") : ""}

${hasWorkExp ? `
Recent experience:
${workExperiences.slice(0, 1).map(exp =>
`${exp.company}, ${exp.position}: ${exp.description || ""}`
).join("\n")}
` : ""}

Rules:
- 1–2 short sentences only
- Direct answer, no introduction
- Simple spoken language
- Mention one example if useful
- No explanations or summaries

Generate ONLY the answer.`;
}

function getProjectPrompt(
  resumeData: {
    fullName?: string | null;
  },
  project: any,
  title: string,
): string {
  return `Explain this project as if an interviewer asked you about it.

Question: ${title}

Project:
- Name: ${project.name}
- Your role: ${project.role}
- What you did: ${project.description}
${project.technologies?.length ? `- Tech: ${project.technologies.join(", ")}` : ""}

Rules:
- Spoken interview style
- 30–60 seconds
- Focus on what YOU did
- Mention one challenge and one result
- Simple words, short sentences
- No formal structure

Generate ONLY the spoken answer.`;
}

function getWorkPrompt(
  resumeData: {
    fullName?: string | null;
  },
  workExperience: any,
  title: string,
): string {
  return `Answer an interview question about this work experience.

Question: ${title}

Work experience:
- Company: ${workExperience.company}
- Role: ${workExperience.position}
- What you did: ${workExperience.description || ""}
${workExperience.responsibilities?.length ? workExperience.responsibilities.join("; ") : ""}

Rules:
- Speak like a real candidate
- 30–60 seconds max
- Focus on impact, not duties
- Mention one concrete result
- Simple language, natural tone
- No STAR labels or bullet points

Generate ONLY the spoken interview answer.`;
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
    console.log("Received request body:", body);
    
    const { resumeId, title, category, itemId } =
      generateMaterialSchema.parse(body);

    console.log("Parsed request:", { resumeId, title, category, itemId });

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

      // 确保 itemId 是数字类型
      const projectId = typeof itemId === "string" ? parseInt(itemId, 10) : itemId;

      console.log("Querying project:", {
        projectId,
        projectIdType: typeof projectId,
        resumeId,
        resumeIdType: typeof resumeId,
        originalItemId: itemId,
        originalItemIdType: typeof itemId,
      });

      if (isNaN(projectId)) {
        return NextResponse.json(
          { error: "Invalid project ID format" },
          { status: 400 },
        );
      }

      const [project] = await db
        .select()
        .from(resumeProjects)
        .where(
          and(
            eq(resumeProjects.id, projectId),
            eq(resumeProjects.resumeId, resumeId),
          ),
        )
        .limit(1);

      console.log("Project query result:", project ? "found" : "not found");

      if (!project) {
        // 检查项目是否存在（不检查 resumeId），用于调试
        const [projectExists] = await db
          .select()
          .from(resumeProjects)
          .where(eq(resumeProjects.id, projectId))
          .limit(1);

        // 列出该简历的所有项目，用于调试
        const allProjects = await db
          .select()
          .from(resumeProjects)
          .where(eq(resumeProjects.resumeId, resumeId))
          .orderBy(resumeProjects.order);

        console.log("All projects for resume", resumeId, ":", allProjects.map(p => ({ id: p.id, name: p.name })));

        if (projectExists) {
          return NextResponse.json(
            {
              error: "Project not found in this resume",
              details: `Project ID ${projectId} exists but does not belong to resume ID ${resumeId}. Available project IDs: ${allProjects.map(p => p.id).join(", ")}`,
            },
            { status: 404 },
          );
        }

        return NextResponse.json(
          {
            error: "Project not found",
            details: `Project ID ${projectId} does not exist. Available project IDs for this resume: ${allProjects.map(p => p.id).join(", ") || "none"}`,
          },
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

      // 确保 itemId 是数字类型
      const workExpId = typeof itemId === "string" ? parseInt(itemId, 10) : itemId;

      if (isNaN(workExpId)) {
        return NextResponse.json(
          { error: "Invalid work experience ID format" },
          { status: 400 },
        );
      }

      const [workExp] = await db
        .select()
        .from(resumeWorkExperiences)
        .where(
          and(
            eq(resumeWorkExperiences.id, workExpId),
            eq(resumeWorkExperiences.resumeId, resumeId),
          ),
        )
        .limit(1);

      if (!workExp) {
        // 检查工作经历是否存在（不检查 resumeId），用于调试
        const [workExpExists] = await db
          .select()
          .from(resumeWorkExperiences)
          .where(eq(resumeWorkExperiences.id, workExpId))
          .limit(1);

        if (workExpExists) {
          return NextResponse.json(
            {
              error: "Work experience not found in this resume",
              details: `Work experience ID ${workExpId} exists but does not belong to resume ID ${resumeId}`,
            },
            { status: 404 },
          );
        }

        return NextResponse.json(
          {
            error: "Work experience not found",
            details: `Work experience ID ${workExpId} does not exist`,
          },
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

