import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/config";
import { listAIModels } from "@/lib/ai/models";
import { getUserAIConfig } from "@/lib/ai/client";

const listModelsSchema = z.object({
  provider: z.enum(["openai", "deepseek", "claude", "gemini", "custom"]),
  apiKey: z.string().optional(),
  apiEndpoint: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const config = listModelsSchema.parse(body);

    // 如果没传 apiKey，则从数据库读取并解密已保存的配置
    let apiKey = config.apiKey;
    let apiEndpoint = config.apiEndpoint;

    if (!apiKey) {
      const userId = parseInt(session.user.id);
      const savedConfig = await getUserAIConfig(userId);

      if (!savedConfig || !savedConfig.apiKey) {
        return NextResponse.json(
          { success: false, error: "请先在个人设置中配置AI API Key" },
          { status: 400 },
        );
      }

      apiKey = savedConfig.apiKey;

      // 如果前端没传 endpoint，则优先使用已保存的 endpoint
      if (!apiEndpoint && savedConfig.apiEndpoint) {
        apiEndpoint = savedConfig.apiEndpoint;
      }
    }

    const models = await listAIModels({
      provider: config.provider,
      apiKey,
      apiEndpoint,
    });

    return NextResponse.json({
      success: true,
      models: models.map((id) => ({ id, name: id })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求数据格式错误", details: error.issues },
        { status: 400 },
      );
    }

    console.error("获取模型列表失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "获取模型列表失败",
      },
      { status: 500 },
    );
  }
}


