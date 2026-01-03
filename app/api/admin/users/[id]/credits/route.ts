import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { users, creditTransactions, userCredits } from "@/lib/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { z } from "zod";

const grantCreditsSchema = z.object({
  amount: z.number().int().positive("积分数量必须大于0"),
  description: z.string().optional(),
});

export async function POST(
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
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    // 解析请求体
    const body = await request.json();
    const validatedData = grantCreditsSchema.parse(body);

    // 检查目标用户是否存在
    const targetUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!targetUser[0]) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 获取用户当前积分余额
    const latestTransaction = await db
      .select({ balanceAfter: creditTransactions.balanceAfter })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(1);

    const currentBalance = latestTransaction[0]?.balanceAfter ?? 0;
    const newBalance = currentBalance + validatedData.amount;

    // 创建积分交易记录
    const transaction = await db
      .insert(creditTransactions)
      .values({
        userId: userId,
        amount: validatedData.amount,
        type: "bonus",
        description:
          validatedData.description || `管理员赠送 ${validatedData.amount} 积分`,
        balanceAfter: newBalance,
        metadata: {
          grantedBy: session.user.id,
          grantedByEmail: session.user.email,
        },
      })
      .returning();

    // 更新或创建用户积分余额记录
    const existingCredits = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    if (existingCredits.length === 0) {
      // 如果用户没有积分记录，创建一个
      await db.insert(userCredits).values({
        userId: userId,
        balance: newBalance,
        totalEarned: validatedData.amount,
        totalSpent: 0,
        updatedAt: new Date(),
      });
    } else {
      // 更新现有积分记录
      await db
        .update(userCredits)
        .set({
          balance: sql`${userCredits.balance} + ${validatedData.amount}`,
          totalEarned: sql`${userCredits.totalEarned} + ${validatedData.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));
    }

    return NextResponse.json({
      message: "积分赠送成功",
      transaction: {
        amount: validatedData.amount,
        balanceAfter: newBalance,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to grant credits:", error);
    return NextResponse.json({ error: "赠送积分失败" }, { status: 500 });
  }
}
