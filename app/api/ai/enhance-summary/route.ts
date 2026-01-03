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
    const { workExperiences, projects, education, jobDescription, style } = body;

    // 构建提示词
    const prompt = `你是一位专业的简历顾问。请基于以下信息，生成3个不同风格的专业个人简介（Summary）。每个简介应该：
1. 突出核心竞争力和专业技能
2. 体现工作经验的价值
3. 简洁有力，3-5句话
4. 使用第一人称或第三人称（根据简历规范）

${jobDescription ? `目标职位描述：\n${jobDescription}\n\n` : ""}

工作经历：
${workExperiences?.map((exp: any) => `- ${exp.company} | ${exp.position} (${exp.startDate} - ${exp.endDate})
  ${exp.responsibilities?.join("; ")}`).join("\n") || "无"}

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
              content: "你是一位专业的简历顾问，擅长撰写吸引人的个人简介。",
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
    let summaries;
    try {
      // 尝试从markdown代码块中提取JSON
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                       content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      summaries = JSON.parse(jsonStr);
    } catch (e) {
      // 如果解析失败，返回原始内容
      summaries = {
        professional: content,
        innovative: content,
        technical: content,
      };
    }

    return NextResponse.json({
      success: true,
      summaries,
    });
  } catch (error) {
    console.error("Summary enhancement failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "生成简介失败"
      },
      { status: 500 }
    );
  }
}
