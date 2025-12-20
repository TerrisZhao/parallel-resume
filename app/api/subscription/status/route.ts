import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, desc } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import {
  users,
  userCredits,
  subscriptions,
  subscriptionPlans,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    // 获取用户积分
    let creditsData = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, user.id))
      .limit(1);

    // 如果用户没有积分记录，创建一个
    if (creditsData.length === 0) {
      await db.insert(userCredits).values({
        userId: user.id,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
      });
      creditsData = [
        {
          id: 0,
          userId: user.id,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          updatedAt: new Date(),
        },
      ];
    }

    const credits = creditsData[0];

    // 获取用户当前订阅
    const activeSubscription = await db
      .select({
        id: subscriptions.id,
        planId: subscriptions.planId,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        planName: subscriptionPlans.name,
        planPrice: subscriptionPlans.price,
      })
      .from(subscriptions)
      .leftJoin(
        subscriptionPlans,
        eq(subscriptions.planId, subscriptionPlans.id),
      )
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active"),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const response = {
      credits: credits.balance,
      totalEarned: credits.totalEarned,
      totalSpent: credits.totalSpent,
      subscription: activeSubscription[0] || null,
      subscriptionStatus: activeSubscription[0]?.status || null,
      subscriptionEndDate: activeSubscription[0]?.currentPeriodEnd || null,
      plan: activeSubscription[0]?.planName || "免费套餐",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取订阅状态失败:", error);

    return NextResponse.json({ error: "获取订阅状态失败" }, { status: 500 });
  }
}
