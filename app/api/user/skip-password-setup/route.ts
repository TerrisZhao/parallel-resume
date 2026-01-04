import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

/**
 * 记录用户跳过设置密码的操作
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 更新用户跳过设置密码的日期为今天
    const result = await db
      .update(users)
      .set({
        passwordSetupSkippedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(users.id, parseInt(session.user.id)), isNull(users.deletedAt)),
      )
      .returning({
        id: users.id,
        passwordSetupSkippedAt: users.passwordSetupSkippedAt,
      });

    if (result.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({
      message: "跳过操作已记录",
      passwordSetupSkippedAt: result[0].passwordSetupSkippedAt,
    });
  } catch (error) {
    console.error("记录跳过操作失败:", error);

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
