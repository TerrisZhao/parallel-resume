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

    // 获取用户当前的订阅（包括设置为取消的）
    const [currentSubscription] = await db
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

    if (!currentSubscription) {
      return NextResponse.json({ error: "没有可恢复的订阅" }, { status: 404 });
    }

    if (!currentSubscription.cancelAtPeriodEnd) {
      return NextResponse.json({ error: "订阅未被取消" }, { status: 400 });
    }

    if (!currentSubscription.stripeSubscriptionId) {
      return NextResponse.json({ error: "订阅配置错误" }, { status: 500 });
    }

    // 调用 Stripe API 恢复订阅
    await stripe.subscriptions.update(
      currentSubscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
      },
    );

    // 更新本地数据库
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, currentSubscription.id));

    return NextResponse.json({
      success: true,
      message: "订阅已恢复自动续费",
    });
  } catch (error) {
    console.error("恢复订阅失败:", error);

    return NextResponse.json({ error: "恢复订阅失败" }, { status: 500 });
  }
}
