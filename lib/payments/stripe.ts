import Stripe from "stripe";

// 初始化 Stripe
// 在构建时使用虚拟密钥，运行时使用真实密钥
const stripeKey =
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_for_build";

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

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
