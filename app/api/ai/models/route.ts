import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { listAIModels } from "@/lib/ai/models";
import { getUserAIConfig } from "@/lib/ai/client";
import { db } from "@/lib/db/drizzle";
import { aiPricingRules } from "@/lib/db/schema";

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

    // 查询所有模型的价格信息
    const pricingRulesData = await db
      .select()
      .from(aiPricingRules)
      .where(
        and(
          eq(aiPricingRules.provider, config.provider),
          eq(aiPricingRules.isActive, true),
        ),
      );

    // 创建价格映射
    const pricingMap = new Map(
      pricingRulesData.map((rule: any) => [
        rule.model,
        {
          creditsPerRequest: rule.creditsPerRequest,
          creditsPerKTokens: rule.creditsPerKTokens,
          pricingType: rule.pricingType,
          description: rule.description,
        },
      ]),
    );

    return NextResponse.json({
      success: true,
      models: models.map((id) => ({
        id,
        name: id,
        pricing: pricingMap.get(id) || null,
      })),
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
