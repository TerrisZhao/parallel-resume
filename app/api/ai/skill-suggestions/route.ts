import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { currentSkills, workExperiences, projects, jobDescription } = body;

    // 构建提示词
    const prompt = `你是一位专业的技术招聘顾问。请分析以下简历信息，提供技能优化建议。

当前技能列表：
${Array.isArray(currentSkills) ? currentSkills.join(", ") : currentSkills || "无"}

${jobDescription ? `目标职位描述：\n${jobDescription}\n\n` : ""}

工作经历：
${workExperiences?.map((exp: any) => `- ${exp.company} | ${exp.position}
  职责：${exp.responsibilities?.join("; ")}`).join("\n") || "无"}

项目经验：
${projects?.map((proj: any) => `- ${proj.name}
  技术栈：${proj.technologies?.join(", ")}
  描述：${proj.description}`).join("\n") || "无"}

请提供以下建议：
1. **推荐添加的技能**：基于工作经历和项目经验，建议添加哪些技能（可能在经历中使用但未列出）
2. **职位匹配技能**：${jobDescription ? "基于目标职位，建议添加哪些关键技能" : "通用的重要技能推荐"}
3. **技能优先级排序**：对现有技能按重要性排序的建议

返回JSON格式：
{
  "suggestedSkills": ["技能1", "技能2", ...],  // 建议添加的技能
  "matchingSkills": ["技能1", "技能2", ...],   // 职位匹配技能
  "priorityOrder": ["技能1", "技能2", ...],    // 推荐的排序
  "reasoning": "简要说明推荐理由"
}`;

    // 调用AI API
    const aiResponse = await fetch(
      process.env.AZURE_OPENAI_ENDPOINT || "",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY || "",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "你是一位专业的技术招聘顾问，擅长分析简历技能匹配度。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      }
    );

    if (!aiResponse.ok) {
      throw new Error("AI服务调用失败");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;

    // 解析JSON响应
    let suggestions;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                       content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      suggestions = JSON.parse(jsonStr);
    } catch (e) {
      suggestions = {
        suggestedSkills: [],
        matchingSkills: [],
        priorityOrder: currentSkills || [],
        reasoning: content,
      };
    }

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("Skill suggestions failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "技能推荐失败"
      },
      { status: 500 }
    );
  }
}
