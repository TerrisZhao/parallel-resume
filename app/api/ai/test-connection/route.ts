import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/config";
import { getUserAIConfig, testAIConnection } from "@/lib/ai/client";

const testConnectionSchema = z.object({
  provider: z.enum(["openai", "deepseek", "claude", "gemini", "custom"]),
  model: z.string(),
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
    const config = testConnectionSchema.parse(body);

    // 如果没传 apiKey，则尝试使用数据库中已保存的配置
    let apiKey = config.apiKey;
    let apiEndpoint = config.apiEndpoint;

    if (!apiKey) {
      const userId = parseInt(session.user.id);
      const userConfigResult = await getUserAIConfig(userId);

      if (
        !userConfigResult ||
        !userConfigResult.config ||
        !userConfigResult.config.apiKey
      ) {
        return NextResponse.json(
          { success: false, error: "请先在个人设置中配置AI API Key" },
          { status: 400 },
        );
      }

      const savedConfig = userConfigResult.config;

      apiKey = savedConfig.apiKey;

      if (!apiEndpoint && savedConfig.apiEndpoint) {
        apiEndpoint = savedConfig.apiEndpoint;
      }
    }

    // 调用AI测试连接函数
    const result = await testAIConnection({
      provider: config.provider,
      model: config.model,
      apiKey,
      apiEndpoint,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "连接成功",
        details: result.details,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "连接失败",
          error: result.error,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求数据格式错误", details: error.issues },
        { status: 400 },
      );
    }

    console.error("测试连接失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 },
    );
  }
}
