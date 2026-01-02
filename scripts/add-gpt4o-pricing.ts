import dotenv from "dotenv";
import path from "path";
import { db } from "../lib/db/drizzle";
import { aiPricingRules } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

// 加载环境变量
dotenv.config({ path: path.join(__dirname, "../.env") });

async function addGPT4oPricing() {
  console.log("开始添加 GPT-4o 计费规则...");

  try {
    // 检查是否已存在
    const existing = await db
      .select()
      .from(aiPricingRules)
      .where(
        and(
          eq(aiPricingRules.provider, "openai"),
          eq(aiPricingRules.model, "gpt-4o"),
        ),
      );

    if (existing.length > 0) {
      console.log("GPT-4o 计费规则已存在，更新中...");
      await db
        .update(aiPricingRules)
        .set({
          creditsPerKTokens: 5,
          pricingType: "token",
          isActive: true,
          description: "GPT-4o - 5积分/1K tokens",
          updatedAt: new Date(),
        })
        .where(eq(aiPricingRules.id, existing[0].id));
      console.log("✅ GPT-4o 计费规则已更新！");
    } else {
      console.log("插入新的 GPT-4o 计费规则...");
      await db.insert(aiPricingRules).values({
        provider: "openai",
        model: "gpt-4o",
        creditsPerKTokens: 5,
        pricingType: "token",
        isActive: true,
        description: "GPT-4o - 5积分/1K tokens",
      });
      console.log("✅ GPT-4o 计费规则已添加！");
    }

    // 验证
    const allRules = await db
      .select()
      .from(aiPricingRules)
      .where(eq(aiPricingRules.provider, "openai"));

    console.log(`\nOpenAI 提供商的所有模型 (${allRules.length} 个):`);
    allRules.forEach((rule: any) => {
      console.log(
        `- ${rule.model}: ${rule.creditsPerKTokens || rule.creditsPerRequest} ${rule.pricingType === "token" ? "积分/1K tokens" : "积分/次"}`,
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("添加计费规则失败:", error);
    process.exit(1);
  }
}

addGPT4oPricing();
