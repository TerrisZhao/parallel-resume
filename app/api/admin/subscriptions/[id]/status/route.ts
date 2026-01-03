import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { users, subscriptionPlans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "无效的状态值" }, { status: 400 });
    }

    // 更新状态
    await db
      .update(subscriptionPlans)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlans.id, planId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update plan status:", error);
    return NextResponse.json(
      { error: "更新套餐状态失败" },
      { status: 500 }
    );
  }
}
