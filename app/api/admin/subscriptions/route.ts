import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { users, subscriptionPlans } from "@/lib/db/schema";
import { eq, desc, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 验证用户是否为 owner
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(session.user.id)))
      .limit(1);

    if (!currentUser[0] || currentUser[0].role !== "owner") {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    // 获取所有订阅计划
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .orderBy(desc(subscriptionPlans.displayOrder), desc(subscriptionPlans.createdAt));

    // 转换数据格式以匹配前端接口
    const formattedPlans = plans.map((plan: typeof plans[number]) => ({
      id: plan.id,
      nameEn: plan.nameEn,
      nameZh: plan.nameZh,
      priceId: plan.stripePriceId || "",
      price: parseFloat(plan.price),
      interval: (plan.interval || "month") as "month" | "year",
      featuresEn: (plan.featuresEn as string[]) || [],
      featuresZh: (plan.featuresZh as string[]) || [],
      isActive: plan.isActive,
      isMostPopular: plan.isPopular,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }));

    return NextResponse.json({ plans: formattedPlans });
  } catch (error) {
    console.error("Failed to fetch subscription plans:", error);
    return NextResponse.json(
      { error: "获取订阅计划失败" },
      { status: 500 }
    );
  }
}
