import dotenv from "dotenv";
import path from "path";
import { db } from "../lib/db/drizzle";
import { subscriptionPlans } from "../lib/db/schema";

// 加载环境变量
dotenv.config({ path: path.join(__dirname, "../.env") });

const plans = [
  {
    nameEn: "Free Plan",
    nameZh: "免费体验版",
    type: "free" as const,
    price: "0",
    interval: null,
    intervalCount: null,
    featuresEn: [
      "Basic resume editing",
      "3 resume templates",
      "Export to PDF",
      "10 AI optimizations/month",
      "Community support",
    ],
    featuresZh: [
      "基础简历编辑功能",
      "3个简历模板",
      "导出PDF格式",
      "每月10次AI优化",
      "社区支持",
    ],
    isActive: true,
    displayOrder: 1,
    descriptionEn: "Perfect for getting started",
    descriptionZh: "适合个人求职者开始使用",
  },
  {
    nameEn: "Pro Plan",
    nameZh: "专业版",
    type: "subscription" as const,
    price: "19.99",
    interval: "month",
    intervalCount: 1,
    stripePriceId: "price_1SkdnGBQrrYOEH9vIKHpv9vl", // Stripe Price ID
    featuresEn: [
      "Unlimited AI optimizations",
      "All premium features",
      "All resume templates",
      "Multiple export formats",
      "Resume analytics",
      "Priority support",
      "Customized suggestions",
      "Team collaboration",
    ],
    featuresZh: [
      "无限次AI优化",
      "所有高级功能",
      "所有简历模板",
      "多格式导出",
      "简历数据分析",
      "优先客户支持",
      "定制化建议",
      "团队协作功能",
    ],
    isActive: true,
    displayOrder: 2,
    descriptionEn: "For active job seekers",
    descriptionZh: "适合频繁求职和职业发展",
  },
  {
    nameEn: "Pro Plan (Yearly)",
    nameZh: "专业版（年付）",
    type: "subscription" as const,
    price: "199.99",
    interval: "year",
    intervalCount: 1,
    featuresEn: [
      "Unlimited AI optimizations",
      "All premium features",
      "Save 20% with annual billing",
      "All resume templates",
      "Multiple export formats",
      "Resume analytics",
      "Priority support",
      "Customized suggestions",
      "Team collaboration",
    ],
    featuresZh: [
      "无限次AI优化",
      "所有高级功能",
      "年付节省20%",
      "所有简历模板",
      "多格式导出",
      "简历数据分析",
      "优先客户支持",
      "定制化建议",
      "团队协作功能",
    ],
    isActive: false,
    displayOrder: 3,
    descriptionEn: "Annual billing saves more",
    descriptionZh: "年付更优惠，节省更多",
  },
  {
    nameEn: "100 Credits",
    nameZh: "100积分包",
    type: "credits" as const,
    price: "9.99",
    interval: "one_time",
    intervalCount: null,
    credits: 100,
    featuresEn: [
      "Get 100 credits",
      "Credits never expire",
      "1 credit = 1 AI optimization",
      "All premium templates",
      "Priority support",
      "Batch export",
    ],
    featuresZh: [
      "获得100积分",
      "积分永不过期",
      "1积分 = 1次AI优化",
      "所有高级模板",
      "优先客户支持",
      "批量导出功能",
    ],
    isActive: true,
    isPopular: true,
    displayOrder: 4,
    descriptionEn: "Pay as you go, flexible credits",
    descriptionZh: "按需使用，灵活充值",
  },
  {
    nameEn: "500 Credits",
    nameZh: "500积分包",
    type: "credits" as const,
    price: "39.99",
    interval: "one_time",
    intervalCount: null,
    credits: 500,
    featuresEn: [
      "Get 500 credits",
      "Credits never expire",
      "Better value",
      "All premium features",
    ],
    featuresZh: ["获得500积分", "积分永不过期", "性价比更高", "所有高级功能"],
    isActive: false,
    displayOrder: 5,
    descriptionEn: "More credits, more savings",
    descriptionZh: "更多优惠，更多积分",
  },
];

async function seedPlans() {
  console.log("开始插入订阅计划数据...");

  try {
    // 检查是否已有数据
    const existing = await db.select().from(subscriptionPlans);
    if (existing.length > 0) {
      console.log(`数据库中已有 ${existing.length} 个套餐，先清空...`);
      // 清空现有数据
      await db.delete(subscriptionPlans);
    }

    // 插入数据
    for (const plan of plans) {
      console.log(`插入套餐: ${plan.nameEn}...`);
      await db.insert(subscriptionPlans).values(plan);
    }

    console.log("✅ 所有套餐数据插入成功！");

    // 验证
    const allPlans = await db.select().from(subscriptionPlans);
    console.log(`\n数据库中现在有 ${allPlans.length} 个套餐:`);
    allPlans.forEach((p: any) => {
      console.log(`- ${p.nameEn} / ${p.nameZh} (${p.type}): $${p.price}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("插入数据失败:", error);
    process.exit(1);
  }
}

seedPlans();
