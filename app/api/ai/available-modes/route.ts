import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { userCredits, subscriptions, aiPricingRules } from "@/lib/db/schema";
import {
  getCreditsSystemConfig,
  getSubscriptionSystemConfig,
} from "@/lib/ai/system-config";

/**
 * 获取用户可用的 AI 配置模式
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // 检查系统配置是否可用
    const creditsConfigAvailable = getCreditsSystemConfig() !== null;
    const subscriptionConfigAvailable = getSubscriptionSystemConfig() !== null;

    // 获取用户积分
    const [credits] = await db
      .select({ balance: userCredits.balance })
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    // 获取用户订阅
    const [subscription] = await db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    // 判断订阅是否活跃
    const hasActiveSubscription =
      subscription &&
      (subscription.status === "active" || subscription.status === "trialing");

    // 获取系统配置信息（不包含 API Key）
    const creditsConfig = getCreditsSystemConfig();
    const subscriptionConfig = getSubscriptionSystemConfig();

    // 获取积分模式的预设模型列表
    let creditsModels: Array<{
      id: string;
      name: string;
      pricing: {
        creditsPerRequest?: number | null;
        creditsPerKTokens?: number | null;
        pricingType?: string | null;
        description?: string | null;
      } | null;
    }> = [];

    if (creditsConfig?.provider) {
      const pricingRules = await db
        .select()
        .from(aiPricingRules)
        .where(
          and(
            eq(aiPricingRules.provider, creditsConfig.provider as any),
            eq(aiPricingRules.isActive, true),
          ),
        );

      creditsModels = pricingRules.map((rule: any) => ({
        id: rule.model,
        name: rule.model,
        pricing: {
          creditsPerRequest: rule.creditsPerRequest,
          creditsPerKTokens: rule.creditsPerKTokens,
          pricingType: rule.pricingType,
          description: rule.description,
        },
      }));
    }

    // 获取订阅模式的预设模型列表
    let subscriptionModels: Array<{
      id: string;
      name: string;
      pricing: {
        creditsPerRequest?: number | null;
        creditsPerKTokens?: number | null;
        pricingType?: string | null;
        description?: string | null;
      } | null;
    }> = [];

    if (subscriptionConfig?.provider) {
      const pricingRules = await db
        .select()
        .from(aiPricingRules)
        .where(
          and(
            eq(aiPricingRules.provider, subscriptionConfig.provider as any),
            eq(aiPricingRules.isActive, true),
          ),
        );

      subscriptionModels = pricingRules.map((rule: any) => ({
        id: rule.model,
        name: rule.model,
        pricing: {
          creditsPerRequest: rule.creditsPerRequest,
          creditsPerKTokens: rule.creditsPerKTokens,
          pricingType: rule.pricingType,
          description: rule.description,
        },
      }));
    }

    const availableModes = {
      credits: {
        available: creditsConfigAvailable && (credits?.balance || 0) > 0,
        balance: credits?.balance || 0,
        systemConfigured: creditsConfigAvailable,
        provider: creditsConfig?.provider,
        model: creditsConfig?.model,
        models: creditsModels,
      },
      subscription: {
        available: subscriptionConfigAvailable && !!hasActiveSubscription,
        hasActiveSubscription: !!hasActiveSubscription,
        systemConfigured: subscriptionConfigAvailable,
        provider: subscriptionConfig?.provider,
        model: subscriptionConfig?.model,
        models: subscriptionModels,
      },
      custom: {
        available: true, // 自定义配置始终可用
      },
    };

    return NextResponse.json({ modes: availableModes });
  } catch (error) {
    console.error("获取可用配置模式失败:", error);

    return NextResponse.json(
      { error: "获取可用配置模式失败" },
      { status: 500 },
    );
  }
}
