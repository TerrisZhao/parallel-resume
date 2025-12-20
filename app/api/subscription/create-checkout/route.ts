import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import {
  stripe,
  PLANS,
  getOrCreateStripeCustomer,
} from "@/lib/payments/stripe";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, planType } = body;

    if (!planId || !planType) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 获取套餐配置
    const plan = PLANS[planId];

    if (!plan) {
      return NextResponse.json({ error: "套餐不存在" }, { status: 404 });
    }

    if (plan.type === "free") {
      return NextResponse.json({ error: "免费套餐无需支付" }, { status: 400 });
    }

    // 获取用户信息
    const [user] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 创建或获取 Stripe 客户
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      session.user.email,
      user.name || undefined,
    );

    // 根据套餐类型创建不同的 Checkout Session
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3100";
    let checkoutSession;

    if (plan.type === "credits") {
      // 一次性购买积分
      checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: plan.name,
                description: plan.description,
                metadata: {
                  planId: plan.id,
                  credits: plan.credits?.toString() || "0",
                },
              },
              unit_amount: Math.round(plan.price * 100), // 转换为分
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscription?canceled=true`,
        metadata: {
          userId: user.id.toString(),
          planId: plan.id,
          planType: plan.type,
          credits: plan.credits?.toString() || "0",
        },
      });
    } else if (plan.type === "subscription") {
      // 创建订阅
      if (!plan.stripePriceId) {
        return NextResponse.json(
          { error: "套餐配置错误：缺少 Stripe Price ID" },
          { status: 500 },
        );
      }

      checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscription?canceled=true`,
        metadata: {
          userId: user.id.toString(),
          planId: plan.id,
          planType: plan.type,
        },
        subscription_data: {
          metadata: {
            userId: user.id.toString(),
            planId: plan.id,
          },
        },
      });
    } else {
      return NextResponse.json({ error: "不支持的套餐类型" }, { status: 400 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("创建 Checkout Session 失败:", error);

    return NextResponse.json({ error: "创建支付会话失败" }, { status: 500 });
  }
}
