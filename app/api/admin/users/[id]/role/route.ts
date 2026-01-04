import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";

const updateRoleSchema = z.object({
  role: z.enum(["owner", "admin", "user"]),
});

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
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    // 解析请求体
    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);

    // 检查目标用户是否存在
    const targetUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!targetUser[0]) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 不允许修改自己的角色
    if (userId === parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "不能修改自己的角色" },
        { status: 400 },
      );
    }

    // 更新用户角色
    const updatedUser = await db
      .update(users)
      .set({
        role: validatedData.role,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
      });

    if (!updatedUser[0]) {
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    return NextResponse.json({
      message: "角色更新成功",
      user: updatedUser[0],
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Failed to update user role:", error);

    return NextResponse.json({ error: "更新角色失败" }, { status: 500 });
  }
}
