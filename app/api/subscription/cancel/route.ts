import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, desc } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { users, subscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 获取用户信息
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 获取用户当前活跃的订阅
    const [activeSubscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active"),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!activeSubscription) {
      return NextResponse.json({ error: "没有活跃的订阅" }, { status: 404 });
    }

    if (!activeSubscription.stripeSubscriptionId) {
      return NextResponse.json({ error: "订阅配置错误" }, { status: 500 });
    }

    // 调用 Stripe API 取消订阅（在周期结束时取消）
    await stripe.subscriptions.update(activeSubscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // 更新本地数据库
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, activeSubscription.id));

    return NextResponse.json({
      success: true,
      message: "订阅将在当前周期结束后取消",
    });
  } catch (error) {
    console.error("取消订阅失败:", error);

    return NextResponse.json({ error: "取消订阅失败" }, { status: 500 });
  }
}
