import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isNull, eq, desc } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { users, creditTransactions } from "@/lib/db/schema";

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

    // 获取所有未删除的用户
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        provider: users.provider,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.createdAt));

    // 为每个用户获取积分余额
    const usersWithCredits = await Promise.all(
      allUsers.map(async (user: (typeof allUsers)[number]) => {
        // 获取该用户最新的积分交易记录
        const latestTransaction = await db
          .select({ balanceAfter: creditTransactions.balanceAfter })
          .from(creditTransactions)
          .where(eq(creditTransactions.userId, user.id))
          .orderBy(desc(creditTransactions.createdAt))
          .limit(1);

        const credits = latestTransaction[0]?.balanceAfter ?? 0;

        return {
          ...user,
          credits,
        };
      }),
    );

    return NextResponse.json({ users: usersWithCredits });
  } catch (error) {
    console.error("Failed to fetch users:", error);

    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}
