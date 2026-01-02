import type { AIResponse } from "@/lib/ai/types";

import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import {
  userCredits,
  creditTransactions,
  aiPricingRules,
} from "@/lib/db/schema";

/**
 * 检查用户是否有足够的积分
 */
export async function checkCreditsBalance(
  userId: number,
  requiredCredits: number,
): Promise<boolean> {
  try {
    const [credits] = await db
      .select({ balance: userCredits.balance })
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    if (!credits) {
      return false;
    }

    return credits.balance >= requiredCredits;
  } catch (error) {
    console.error("检查积分余额失败:", error);

    return false;
  }
}

/**
 * 获取 AI 模型的计费规则
 */
export async function getAIPricingRule(
  provider: string,
  model: string,
): Promise<{
  creditsPerRequest?: number;
  creditsPerKTokens?: number;
  pricingType: "token" | "request";
} | null> {
  try {
    const [rule] = await db
      .select()
      .from(aiPricingRules)
      .where(
        and(
          eq(aiPricingRules.provider, provider as any),
          eq(aiPricingRules.model, model),
          eq(aiPricingRules.isActive, true),
        ),
      )
      .limit(1);

    if (!rule) {
      // 返回默认计费规则
      const defaultCreditsPerKTokens = parseInt(
        process.env.DEFAULT_CREDITS_PER_1K_TOKENS || "5",
      );
      const defaultPricingType = (process.env.DEFAULT_PRICING_TYPE ||
        "token") as "token" | "request";

      return {
        creditsPerKTokens: defaultCreditsPerKTokens,
        pricingType: defaultPricingType,
      };
    }

    return {
      creditsPerRequest: rule.creditsPerRequest || undefined,
      creditsPerKTokens: rule.creditsPerKTokens || undefined,
      pricingType: rule.pricingType as "token" | "request",
    };
  } catch (error) {
    console.error("获取计费规则失败:", error);

    return null;
  }
}

/**
 * 计算 AI 调用消耗的积分
 */
export async function calculateCreditsForUsage(
  provider: string,
  model: string,
  usage?: AIResponse["usage"],
): Promise<number> {
  const pricingRule = await getAIPricingRule(provider, model);

  if (!pricingRule) {
    return 0;
  }

  if (pricingRule.pricingType === "request") {
    // 按请求次数计费
    return pricingRule.creditsPerRequest || 0;
  } else {
    // 按 token 数量计费
    if (!usage || !usage.totalTokens) {
      return 0;
    }
    const kTokens = usage.totalTokens / 1000;
    const credits = Math.ceil(kTokens * (pricingRule.creditsPerKTokens || 0));

    return credits;
  }
}

/**
 * 消耗用户积分
 */
export async function consumeCredits(
  userId: number,
  credits: number,
  provider: string,
  model: string,
  usage?: AIResponse["usage"],
  description?: string,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    // 获取计费规则以记录正确的计费类型
    const pricingRule = await getAIPricingRule(provider, model);

    return await db.transaction(async (tx: typeof db) => {
      // 获取当前积分
      const [currentCredits] = await tx
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      if (!currentCredits) {
        // 如果用户没有积分记录，创建一个
        await tx.insert(userCredits).values({
          userId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
        });

        return {
          success: false,
          newBalance: 0,
          error: "积分余额不足",
        };
      }

      // 检查是否允许负余额
      const allowNegative = process.env.ALLOW_NEGATIVE_CREDITS === "true";

      if (!allowNegative && currentCredits.balance < credits) {
        return {
          success: false,
          newBalance: currentCredits.balance,
          error: "积分余额不足",
        };
      }

      // 扣除积分
      const newBalance = currentCredits.balance - credits;

      await tx
        .update(userCredits)
        .set({
          balance: newBalance,
          totalSpent: currentCredits.totalSpent + credits,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));

      // 记录交易
      await tx.insert(creditTransactions).values({
        userId,
        amount: -credits,
        type: "usage",
        description: description || `AI 调用 - ${provider}/${model}`,
        relatedType: "ai_usage",
        balanceAfter: newBalance,
        metadata: {
          provider,
          model,
          promptTokens: usage?.promptTokens,
          completionTokens: usage?.completionTokens,
          totalTokens: usage?.totalTokens,
          pricingType: pricingRule?.pricingType || "request",
          creditsCharged: credits,
        },
      });

      return {
        success: true,
        newBalance,
      };
    });
  } catch (error) {
    console.error("消耗积分失败:", error);

    return {
      success: false,
      newBalance: 0,
      error: "系统错误，请稍后重试",
    };
  }
}

/**
 * 初始化用户积分账户（新用户注册时调用）
 */
export async function initializeUserCredits(userId: number): Promise<void> {
  const freeCredits = parseInt(process.env.FREE_SIGNUP_CREDITS || "100");

  try {
    await db.transaction(async (tx: typeof db) => {
      // 创建积分账户
      await tx.insert(userCredits).values({
        userId,
        balance: freeCredits,
        totalEarned: freeCredits,
        totalSpent: 0,
      });

      // 记录赠送交易
      if (freeCredits > 0) {
        await tx.insert(creditTransactions).values({
          userId,
          amount: freeCredits,
          type: "bonus",
          description: "新用户注册赠送",
          balanceAfter: freeCredits,
        });
      }
    });
  } catch (error) {
    console.error("初始化用户积分失败:", error);
    throw error;
  }
}

/**
 * 获取用户当前积分余额
 */
export async function getUserCreditsBalance(
  userId: number,
): Promise<number | null> {
  try {
    const [credits] = await db
      .select({ balance: userCredits.balance })
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    return credits?.balance || null;
  } catch (error) {
    console.error("获取用户积分余额失败:", error);

    return null;
  }
}
