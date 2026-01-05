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

const parseResumeSchema = z.object({
  content: z.string().min(10, "Resume content is too short"),
});

const PARSE_RESUME_SYSTEM_PROMPT = `You are an expert resume parser with advanced text processing capabilities. Your task is to extract structured information from resume text and convert it into a standardized JSON format.

CRITICAL INSTRUCTIONS:
1. **Language Preservation**: Detect the language of the resume content and preserve it in the output. Extract all information accurately without translating or modifying the original text.
2. **Format Handling**: The input text may have formatting issues from copy-paste errors (e.g., extra line breaks, missing spaces, extra whitespace, special characters). Intelligently reconstruct the content to extract complete and accurate information.
3. **Error Tolerance**: Handle common paste errors such as:
   - Line breaks in the middle of sentences or words
   - Multiple consecutive spaces or line breaks
   - Missing spaces between words
   - Garbled characters or encoding issues
   - Incomplete sections due to copy errors
4. **Context Understanding**: Use context to determine where information belongs, even if formatting is broken.`;

function getParseResumePrompt(content: string): string {
  return `Parse the following resume content and extract all relevant information into a structured JSON format.

**IMPORTANT - Text Preprocessing:**
The content below may contain formatting errors from copy-paste (extra line breaks, missing spaces, etc.). Please:
- Intelligently merge broken lines that should be together
- Remove excessive whitespace while preserving meaningful structure
- Reconstruct complete sentences and paragraphs from fragmented text
- Use context clues to identify section boundaries even if formatting is inconsistent

**Resume Content:**
${content}

**EXTRACTION INSTRUCTIONS:**
1. **Text Integrity**: Clean up formatting issues and extract the actual intended content, not the broken formatting
2. **Language Preservation**: Extract information exactly as written - do not translate or modify the original text
3. **Original Language**: Preserve the language of the content (Chinese→Chinese, English→English)
4. **Missing Fields**: If a field is not found in the resume, use an empty string or empty array
5. **Date Formats**: Extract dates in the format they appear (e.g., "2020-01" or "Jan 2020" or "2020年1月")
6. **Skill Categorization**: Intelligently group and categorize skills found in the resume
7. **Responsibilities**: Extract as an array of complete, meaningful strings for work experience
8. **Technologies**: Extract as an array of strings for projects
9. **Complete Information**: Make sure to extract ALL information present, even if it's in poorly formatted sections

**Return Format (strict JSON):**
{
  "fullName": "Full name of the person",
  "preferredName": "Preferred or nickname if mentioned",
  "phone": "Phone number",
  "email": "Email address",
  "location": "City, State/Country",
  "linkedin": "LinkedIn profile URL or handle",
  "github": "GitHub profile URL or handle",
  "website": "Personal website URL",
  "summary": "Professional summary or objective statement",
  "keySkills": [
    {
      "groupName": "Skill category name (e.g., Programming Languages, Frameworks)",
      "skills": ["Skill 1", "Skill 2", "Skill 3"]
    }
  ],
  "workExperience": [
    {
      "company": "Company name",
      "position": "Job title",
      "startDate": "Start date",
      "endDate": "End date (or 'Present')",
      "current": false,
      "description": "Brief description of the role",
      "responsibilities": ["Responsibility 1", "Responsibility 2"]
    }
  ],
  "education": [
    {
      "school": "University/School name",
      "degree": "Degree type (e.g., Bachelor of Science)",
      "major": "Major/Field of study",
      "startDate": "Start date",
      "endDate": "End date (or 'Present')",
      "current": false,
      "gpa": "GPA if mentioned"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "role": "Your role in the project",
      "startDate": "Start date",
      "endDate": "End date (or 'Present')",
      "current": false,
      "description": "Project description",
      "technologies": ["Technology 1", "Technology 2"]
    }
  ],
  "additionalInfo": "Any certifications, awards, languages, or other relevant information"
}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get user AI config
    const aiConfigData = await getUserAIConfig(userId);

    if (!aiConfigData || !aiConfigData.config) {
      return NextResponse.json(
        { error: "Please configure AI model in settings first" },
        { status: 400 },
      );
    }

    const { config: aiConfig, mode } = aiConfigData;

    const body = await request.json();
    const { content } = parseResumeSchema.parse(body);

    const maxTokens = 3000;
    const prompt = getParseResumePrompt(content);

    // Check credits if in credits mode
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

    // Call AI
    const response = await callAI({
      config: aiConfig,
      prompt,
      systemPrompt: PARSE_RESUME_SYSTEM_PROMPT,
      temperature: 0.3, // Lower temperature for more accurate extraction
      maxTokens,
    });

    // Consume credits if in credits mode
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
        "Resume Parsing",
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to consume credits" },
          { status: 500 },
        );
      }

      newBalance = result.newBalance;
    }

    // Parse AI response
    let parsedData;

    try {
      const cleanedResponse = response.content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      parsedData = JSON.parse(cleanedResponse);

      // Validate required structure
      if (typeof parsedData !== "object") {
        throw new Error("Invalid response format");
      }

      // Add unique IDs to skill groups if they don't have them
      if (parsedData.keySkills && Array.isArray(parsedData.keySkills)) {
        parsedData.keySkills = parsedData.keySkills.map(
          (group: any, index: number) => ({
            id: group.id || `skill-group-${Date.now()}-${index}`,
            groupName: group.groupName || "",
            skills: Array.isArray(group.skills) ? group.skills : [],
          }),
        );
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse resume content. Please try again.",
          rawResponse: response.content,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
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

    console.error("Resume parsing failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Resume parsing failed",
      },
      { status: 500 },
    );
  }
}
