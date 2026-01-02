import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

// 验证设置密码的请求体
const setPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "密码长度至少为8个字符")
    .max(100, "密码长度不能超过100个字符"),
});

/**
 * 设置用户密码（用于首次登录）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = setPasswordSchema.parse(body);

    // 获取用户信息
    const [user] = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        firstLoginCompleted: users.firstLoginCompleted,
      })
      .from(users)
      .where(
        and(eq(users.id, parseInt(session.user.id)), isNull(users.deletedAt))
      )
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 对密码进行哈希处理
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // 更新用户密码和首次登录状态
    const result = await db
      .update(users)
      .set({
        passwordHash: passwordHash,
        firstLoginCompleted: true,
        updatedAt: new Date(),
      })
      .where(
        and(eq(users.id, parseInt(session.user.id)), isNull(users.deletedAt))
      )
      .returning({
        id: users.id,
        firstLoginCompleted: users.firstLoginCompleted,
      });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "更新密码失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "密码设置成功",
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求数据格式错误", details: error.issues },
        { status: 400 }
      );
    }

    console.error("设置密码失败:", error);

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
