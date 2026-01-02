import dotenv from "dotenv";
import path from "path";
import { db } from "../lib/db/drizzle";
import { aiPricingRules } from "../lib/db/schema";
import { eq } from "drizzle-orm";

// 加载环境变量
dotenv.config({ path: path.join(__dirname, "../.env") });

async function resetAIModels() {
  console.log("开始重置 AI 模型配置...");

  try {
    // 1. 清空现有的 OpenAI 模型
    console.log("清空现有的 OpenAI 模型...");
    await db.delete(aiPricingRules).where(eq(aiPricingRules.provider, "openai"));

    // 2. 插入新的两个模型
    console.log("插入新的模型配置...");

    const models = [
      {
        provider: "openai" as const,
        model: "gpt-5.2",
        creditsPerKTokens: 3,
        pricingType: "token" as const,
        isActive: true,
        description: "GPT-5.2 - 3积分/1K tokens（推荐）",
      },
      {
        provider: "openai" as const,
        model: "gpt-4o",
        creditsPerKTokens: 5,
        pricingType: "token" as const,
        isActive: true,
        description: "GPT-4o - 5积分/1K tokens",
      },
    ];

    for (const model of models) {
      await db.insert(aiPricingRules).values(model);
      console.log(`✓ 已添加: ${model.model} - ${model.description}`);
    }

    // 3. 验证结果
    console.log("\n验证结果...");
    const allModels = await db
      .select()
      .from(aiPricingRules)
      .where(eq(aiPricingRules.provider, "openai"));

    console.log(`\n当前 OpenAI 提供商的模型 (${allModels.length} 个):`);
    allModels.forEach((model: { model: string; creditsPerKTokens: any; }, index: number) => {
      console.log(
        `${index + 1}. ${model.model}: ${model.creditsPerKTokens} 积分/1K tokens ${model.model === "gpt-5.2" ? "⭐ 默认" : ""}`,
      );
    });

    console.log("\n✅ AI 模型配置重置完成！");
    console.log("\n📝 下一步：请更新 .env 文件中的默认模型：");
    console.log("   DEFAULT_SUBSCRIPTION_MODEL=gpt-5.2");

    process.exit(0);
  } catch (error) {
    console.error("重置失败:", error);
    process.exit(1);
  }
}

resetAIModels();
