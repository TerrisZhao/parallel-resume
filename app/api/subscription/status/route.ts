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

    // 获取用户语言偏好（从请求或用户设置）
    const locale = request.cookies.get("NEXT_LOCALE")?.value || "en";

    // 获取用户当前订阅
    const activeSubscription = await db
      .select({
        id: subscriptions.id,
        planId: subscriptions.planId,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        planNameEn: subscriptionPlans.nameEn,
        planNameZh: subscriptionPlans.nameZh,
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

    // 格式化订阅数据，将 planPrice 映射为 price，根据语言选择套餐名称
    const subscriptionData = activeSubscription[0]
      ? {
          id: activeSubscription[0].id,
          planId: activeSubscription[0].planId,
          status: activeSubscription[0].status,
          currentPeriodStart:
            activeSubscription[0].currentPeriodStart?.toISOString() || null,
          currentPeriodEnd:
            activeSubscription[0].currentPeriodEnd?.toISOString() || null,
          cancelAtPeriodEnd: activeSubscription[0].cancelAtPeriodEnd,
          plan:
            locale === "zh"
              ? activeSubscription[0].planNameZh
              : activeSubscription[0].planNameEn,
          price: activeSubscription[0].planPrice
            ? parseFloat(activeSubscription[0].planPrice)
            : 0,
        }
      : null;

    const response = {
      credits: credits.balance,
      totalEarned: credits.totalEarned,
      totalSpent: credits.totalSpent,
      subscription: subscriptionData,
      subscriptionStatus: activeSubscription[0]?.status || null,
      subscriptionEndDate: activeSubscription[0]?.currentPeriodEnd || null,
      plan:
        (locale === "zh"
          ? activeSubscription[0]?.planNameZh
          : activeSubscription[0]?.planNameEn) ||
        (locale === "zh" ? "免费套餐" : "Free Plan"),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取订阅状态失败:", error);

    return NextResponse.json({ error: "获取订阅状态失败" }, { status: 500 });
  }
}
