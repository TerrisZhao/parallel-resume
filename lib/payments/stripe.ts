import Stripe from "stripe";

// 初始化 Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// 套餐配置（与前端保持一致）
export interface PlanConfig {
  id: string;
  name: string;
  type: "free" | "credits" | "subscription";
  price: number;
  credits?: number;
  interval?: "month" | "year";
  stripePriceId?: string;
  features: string[];
  description: string;
}

// 定义所有套餐
export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "免费套餐",
    type: "free",
    price: 0,
    features: [
      "基础简历编辑功能",
      "3个简历模板",
      "导出PDF格式",
      "每月10次AI优化",
      "社区支持",
    ],
    description: "适合个人求职者开始使用",
  },
  "credits-100": {
    id: "credits-100",
    name: "积分充值包 - 100积分",
    type: "credits",
    price: 9.99,
    credits: 100,
    stripePriceId: process.env.STRIPE_PRICE_CREDITS_100,
    features: [
      "获得100积分",
      "积分永不过期",
      "1积分 = 1次AI优化",
      "所有高级模板",
      "优先客户支持",
      "批量导出功能",
    ],
    description: "按需使用，灵活充值",
  },
  "credits-500": {
    id: "credits-500",
    name: "积分充值包 - 500积分",
    type: "credits",
    price: 39.99,
    credits: 500,
    stripePriceId: process.env.STRIPE_PRICE_CREDITS_500,
    features: ["获得500积分", "积分永不过期", "性价比更高", "所有高级功能"],
    description: "更多优惠，更多积分",
  },
  "pro-monthly": {
    id: "pro-monthly",
    name: "专业版 - 月付",
    type: "subscription",
    price: 19.99,
    interval: "month",
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
    features: [
      "无限次AI优化",
      "所有高级功能",
      "所有简历模板",
      "多格式导出",
      "简历数据分析",
      "优先客户支持",
      "定制化建议",
      "团队协作功能",
    ],
    description: "适合频繁求职和职业发展",
  },
  "pro-yearly": {
    id: "pro-yearly",
    name: "专业版 - 年付",
    type: "subscription",
    price: 199.99,
    interval: "year",
    stripePriceId: process.env.STRIPE_PRICE_PRO_YEARLY,
    features: [
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
    description: "年付更优惠，节省更多",
  },
};

// 创建或获取 Stripe 客户
export async function getOrCreateStripeCustomer(
  userId: number,
  email: string,
  name?: string,
): Promise<string> {
  const { db } = await import("@/lib/db/drizzle");
  const { users } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  // 查询用户是否已有 Stripe 客户 ID
  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // 创建新的 Stripe 客户
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId: userId.toString(),
    },
  });

  // 更新数据库
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId));

  return customer.id;
}
