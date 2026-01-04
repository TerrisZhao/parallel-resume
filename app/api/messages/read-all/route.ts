import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { messages, users } from "@/lib/db/schema";

export async function PATCH(request: NextRequest) {
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

    // 标记所有未读消息为已读
    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(eq(messages.userId, currentUser[0].id), eq(messages.isRead, false)),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark all messages as read:", error);

    return NextResponse.json(
      { error: "标记所有消息为已读失败" },
      { status: 500 },
    );
  }
}
