#!/usr/bin/env tsx
/**
 * 项目初始化脚本
 * 用于首次运行项目时进行环境检查、数据库迁移和初始数据填充
 *
 * 使用方法: npm run init
 */

// 必须在导入其他模块之前加载环境变量
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

// 动态导入数据库模块（在环境变量加载后）
let db: any;
let users: any;
let subscriptionPlans: any;
let aiPricingRules: any;
let userCredits: any;

async function initializeDatabase() {
  const drizzleModule = await import("../lib/db/drizzle");
  const schemaModule = await import("../lib/db/schema");

  db = drizzleModule.db;
  users = schemaModule.users;
  subscriptionPlans = schemaModule.subscriptionPlans;
  aiPricingRules = schemaModule.aiPricingRules;
  userCredits = schemaModule.userCredits;
}

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step: number, message: string) {
  log(`\n[${step}/7] ${message}`, colors.cyan);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

// 必需的环境变量
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "ENCRYPTION_KEY",
  "COMMON_AI_PROVIDER",
  "COMMON_AI_API_KEY",
  "COMMON_AI_API_ENDPOINT",
];

// 可选但推荐的环境变量
const RECOMMENDED_ENV_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_PUBLIC_BASE_URL",
];

/**
 * 步骤 1: 检查环境变量
 */
async function checkEnvironmentVariables() {
  logStep(1, "检查环境变量");

  let hasError = false;

  // 检查必需的环境变量
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      logError(`缺少必需的环境变量: ${varName}`);
      hasError = true;
    } else {
      logSuccess(`${varName}: 已配置`);
    }
  }

  // 检查推荐的环境变量
  log("\n推荐配置（可选）:", colors.bright);
  for (const varName of RECOMMENDED_ENV_VARS) {
    if (!process.env[varName]) {
      logWarning(`${varName}: 未配置`);
    } else {
      logSuccess(`${varName}: 已配置`);
    }
  }

  if (hasError) {
    logError("\n环境变量检查失败！请在 .env 文件中配置缺少的变量。");
    process.exit(1);
  }

  logSuccess("\n环境变量检查通过！");
}

/**
 * 步骤 2: 测试数据库连接
 */
async function testDatabaseConnection() {
  logStep(2, "测试数据库连接");

  if (!db) {
    logError("数据库连接未初始化！");
    logError("请确保 DATABASE_URL 环境变量已正确配置。");
    process.exit(1);
  }

  try {
    // 尝试执行一个简单的查询
    await db.execute("SELECT 1");
    logSuccess(`数据库连接成功: ${process.env.DATABASE_URL?.split("@")[1]}`);
  } catch (error) {
    logError("数据库连接失败！");
    console.error(error);
    process.exit(1);
  }
}

/**
 * 步骤 3: 运行数据库迁移
 */
async function runDatabaseMigrations() {
  logStep(3, "运行数据库迁移");

  try {
    const { execSync } = await import("child_process");
    const fs = await import("fs");

    // 检查数据库是否已经初始化
    try {
      const result = await db.execute(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'users'
        )`,
      );

      const tableExists = result.rows?.[0]?.exists;

      if (tableExists) {
        logWarning("数据库表已存在，跳过迁移。");
        logSuccess("如需重新迁移，请先清空数据库。");
        return;
      }
    } catch (error) {
      // 如果查询失败，继续执行迁移
      log("检查表是否存在时出错，继续执行迁移...", colors.yellow);
    }

    // 检查是否需要先生成迁移文件
    const migrationsDir = path.join(__dirname, "../drizzle");
    const journalFile = path.join(migrationsDir, "meta", "_journal.json");

    if (!fs.existsSync(journalFile)) {
      log("迁移文件不存在，生成迁移文件...", colors.yellow);
      execSync("npx drizzle-kit generate", {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
      });
      logSuccess("迁移文件生成完成！");
    }

    log("执行数据库迁移...", colors.bright);
    execSync("npx drizzle-kit migrate", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });

    logSuccess("数据库迁移完成！");
  } catch (error: any) {
    logError("数据库迁移失败！");

    // 检查是否是因为类型或表已存在
    if (
      error.message?.includes("already exists") ||
      error.stderr?.includes("already exists")
    ) {
      log("\n" + "=".repeat(60), colors.yellow);
      logWarning("数据库处于半初始化状态！");
      log("=".repeat(60), colors.yellow);
      log("\n建议的解决方案：", colors.cyan);
      log("1. 重置数据库（会删除所有数据）：", colors.bright);
      log("   pnpm db:reset", colors.green);
      log("   pnpm init", colors.green);
      log("\n2. 或手动清理数据库：", colors.bright);
      log("   psql -d parallel-resume", colors.green);
      log("   DROP SCHEMA public CASCADE;", colors.green);
      log("   CREATE SCHEMA public;", colors.green);
      log("   \\q", colors.green);
      log("   pnpm init\n", colors.green);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * 步骤 4: 填充订阅计划数据
 */
async function seedSubscriptionPlans() {
  logStep(4, "填充订阅计划数据");

  try {
    // 检查是否已有数据
    const existingPlans = await db.select().from(subscriptionPlans);

    if (existingPlans.length > 0) {
      logWarning("订阅计划数据已存在，跳过填充。");
      return;
    }

    const plans = [
      {
        name: "free",
        nameEn: "Free Plan",
        nameZh: "免费体验版",
        type: "free" as const,
        price: "0",
        credits: 0,
        interval: null,
        intervalCount: null,
        features: [],
        featuresEn: ["Basic resume editing", "Single resume export", "Basic templates"],
        featuresZh: ["基础简历编辑", "单个简历导出", "基础模板"],
        stripePriceId: null,
        isActive: true,
        isPopular: false,
        displayOrder: 1,
        description: "Perfect for getting started",
        descriptionEn: "Perfect for getting started",
        descriptionZh: "免费体验版",
      },
      {
        name: "pro-monthly",
        nameEn: "Pro Plan",
        nameZh: "专业版",
        type: "subscription" as const,
        price: "19.99",
        credits: null,
        interval: "month",
        intervalCount: 1,
        features: [],
        featuresEn: [
          "Unlimited resume creation",
          "All premium templates",
          "AI optimization",
          "PDF export",
          "Priority support",
        ],
        featuresZh: [
          "无限简历创建",
          "所有高级模板",
          "AI 智能优化",
          "PDF 导出",
          "优先客服",
        ],
        stripePriceId: "price_1SkdnGBQrrYOEH9vIKHpv9vl", // 从 Stripe 获取的 Price ID
        isActive: true,
        isPopular: false,
        displayOrder: 2,
        description: "For active job seekers",
        descriptionEn: "For active job seekers",
        descriptionZh: "适合频繁求职和职业发展",
      },
      {
        name: "credits-100",
        nameEn: "100 Credits",
        nameZh: "100积分包",
        type: "credits" as const,
        price: "9.99",
        credits: 100,
        interval: "one_time",
        intervalCount: null,
        features: [],
        featuresEn: ["100 credits", "Pay as you go", "Never expire"],
        featuresZh: ["100 积分", "按需使用", "永不过期"],
        stripePriceId: null, // Credits 类型套餐会动态创建价格
        isActive: true,
        isPopular: true,
        displayOrder: 3,
        description: "For occasional use",
        descriptionEn: "For occasional use",
        descriptionZh: "适合偶尔使用",
      },
      {
        name: "credits-500",
        nameEn: "500 Credits",
        nameZh: "500积分包",
        type: "credits" as const,
        price: "39.99",
        credits: 500,
        interval: "one_time",
        intervalCount: null,
        features: [],
        featuresEn: ["500 credits", "Pay as you go", "Never expire", "Best value"],
        featuresZh: ["500 积分", "按需使用", "永不过期", "性价比最高"],
        stripePriceId: null, // Credits 类型套餐会动态创建价格
        isActive: false,
        isPopular: false,
        displayOrder: 4,
        description: "Best value",
        descriptionEn: "Best value",
        descriptionZh: "性价比之选",
      },
      {
        name: "pro-yearly",
        nameEn: "Pro Plan",
        nameZh: "专业版",
        type: "subscription" as const,
        price: "199.99",
        credits: null,
        interval: "year",
        intervalCount: 1,
        features: [],
        featuresEn: [
          "Unlimited resume creation",
          "All premium templates",
          "AI optimization",
          "PDF export",
          "Priority support",
          "Save 17%",
        ],
        featuresZh: [
          "无限简历创建",
          "所有高级模板",
          "AI 智能优化",
          "PDF 导出",
          "优先客服",
          "节省 17%",
        ],
        stripePriceId: null, // 如需启用年付套餐，需要在 Stripe 创建对应的 Price ID
        isActive: false,
        isPopular: false,
        displayOrder: 5,
        description: "Annual billing saves more",
        descriptionEn: "Annual billing saves more",
        descriptionZh: "年付更优惠",
      },
    ];

    for (const plan of plans) {
      await db.insert(subscriptionPlans).values(plan);
      logSuccess(`已添加订阅计划: ${plan.name}`);
    }

    logSuccess(`\n成功添加 ${plans.length} 个订阅计划！`);
  } catch (error) {
    logError("填充订阅计划数据失败！");
    console.error(error);
    process.exit(1);
  }
}

/**
 * 步骤 5: 填充 AI 价格规则
 */
async function seedAIPricingRules() {
  logStep(5, "填充 AI 价格规则");

  try {
    // 检查是否已有数据
    const existingRules = await db.select().from(aiPricingRules);

    if (existingRules.length > 0) {
      logWarning("AI 价格规则已存在，跳过填充。");
      return;
    }

    const rules = [
      {
        provider: "openai" as const,
        model: "gpt-5-mini",
        creditsPerKTokens: 1,
        pricingType: "token" as const,
        isActive: true,
        description: "GPT-5-mini - 1积分/1K tokens（基准模型）",
      },
      {
        provider: "openai" as const,
        model: "gpt-5.2",
        creditsPerKTokens: 7,
        pricingType: "token" as const,
        isActive: true,
        description: "GPT-5.2 - 7积分/1K tokens（高级模型）",
      },
    ];

    for (const rule of rules) {
      await db.insert(aiPricingRules).values(rule);
      logSuccess(`已添加 AI 价格规则: ${rule.model}`);
    }

    logSuccess(`\n成功添加 ${rules.length} 个 AI 价格规则！`);
  } catch (error) {
    logError("填充 AI 价格规则失败！");
    console.error(error);
    process.exit(1);
  }
}

/**
 * 步骤 6: 创建测试用户（可选）
 */
async function createTestUser() {
  logStep(6, "创建测试用户");

  try {
    // 检查是否已有用户
    const existingUsers = await db.select().from(users);

    if (existingUsers.length > 0) {
      logWarning(`数据库中已有 ${existingUsers.length} 个用户，跳过创建测试用户。`);
      return;
    }

    const testEmail = "test@example.com";
    const testPassword = "password123";

    // 哈希密码
    const bcryptModule = await import("bcryptjs");
    const bcrypt = bcryptModule.default || bcryptModule;
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // 创建测试用户
    const [user] = await db
      .insert(users)
      .values({
        email: testEmail,
        name: "Test User",
        passwordHash: passwordHash,
        provider: "credentials",
        role: "owner",
        emailVerified: true,
        firstLoginCompleted: false, // 首次登录需要设置密码
        aiConfigMode: "credits",
      })
      .returning({ id: users.id });

    logSuccess(`已创建测试用户: ${testEmail} (ID: ${user.id})`);
    log(`  邮箱: ${testEmail}`, colors.cyan);
    log(`  密码: ${testPassword}`, colors.cyan);
    log(`  角色: owner`, colors.cyan);
  } catch (error) {
    logError("创建测试用户失败！");
    console.error(error);
    // 不退出，允许继续
  }
}

/**
 * 步骤 7: 验证配置
 */
async function validateSetup() {
  logStep(7, "验证配置");

  try {
    // 检查订阅计划
    const plans = await db.select().from(subscriptionPlans);
    logSuccess(`订阅计划: ${plans.length} 个`);

    // 检查 AI 价格规则
    const rules = await db.select().from(aiPricingRules);
    logSuccess(`AI 价格规则: ${rules.length} 个`);

    // 检查用户
    const allUsers = await db.select().from(users);
    logSuccess(`用户数量: ${allUsers.length} 个`);

    log("\n配置验证成功！", colors.green);
  } catch (error) {
    logError("配置验证失败！");
    console.error(error);
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  log("\n" + "=".repeat(60), colors.bright);
  log("🚀 Parallel Resume 项目初始化", colors.bright);
  log("=".repeat(60), colors.bright);

  try {
    // 首先加载数据库模块
    await initializeDatabase();

    await checkEnvironmentVariables();
    await testDatabaseConnection();
    await runDatabaseMigrations();
    await seedSubscriptionPlans();
    await seedAIPricingRules();
    await createTestUser();
    await validateSetup();

    log("\n" + "=".repeat(60), colors.bright);
    log("✅ 项目初始化完成！", colors.green);
    log("=".repeat(60), colors.bright);

    log("\n下一步:", colors.cyan);
    log("  1. 运行开发服务器: npm run dev", colors.bright);
    log("  2. 访问 http://localhost:3100", colors.bright);
    log("  3. 使用以下方式登录：", colors.bright);
    log("     - Google 账号", colors.cyan);
    log("     - 测试账号：test@example.com / password123\n", colors.cyan);

    process.exit(0);
  } catch (error) {
    log("\n" + "=".repeat(60), colors.bright);
    logError("❌ 项目初始化失败！");
    log("=".repeat(60), colors.bright);
    console.error(error);
    process.exit(1);
  }
}

// 运行主函数
main();
