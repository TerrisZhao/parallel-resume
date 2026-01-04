import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { users, subscriptionPlans } from "@/lib/db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const planId = parseInt(id);
    const body = await request.json();
    const { nameEn, nameZh, priceId, price, interval } = body;

    // 验证输入
    if (!nameEn || !nameZh || !priceId || price === undefined || !interval) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    if (price < 0) {
      return NextResponse.json({ error: "价格不能为负数" }, { status: 400 });
    }

    if (!["month", "year"].includes(interval)) {
      return NextResponse.json({ error: "无效的计费周期" }, { status: 400 });
    }

    // 更新订阅计划
    await db
      .update(subscriptionPlans)
      .set({
        nameEn,
        nameZh,
        stripePriceId: priceId,
        price: price.toString(),
        interval,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlans.id, planId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update subscription plan:", error);

    return NextResponse.json({ error: "更新订阅计划失败" }, { status: 500 });
  }
}
