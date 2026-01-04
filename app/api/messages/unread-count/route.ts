import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, count } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { messages, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(session.user.id)))
      .limit(1);

    if (!currentUser[0]) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 获取未读消息数量
    const result = await db
      .select({ count: count() })
      .from(messages)
      .where(
        and(eq(messages.userId, currentUser[0].id), eq(messages.isRead, false)),
      );

    const unreadCount = result[0]?.count || 0;

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Failed to fetch unread count:", error);

    return NextResponse.json(
      { error: "获取未读消息数量失败" },
      { status: 500 },
    );
  }
}
