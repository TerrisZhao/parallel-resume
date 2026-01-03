import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { messages, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const messageId = parseInt(id);

    if (isNaN(messageId)) {
      return NextResponse.json({ error: "无效的消息ID" }, { status: 400 });
    }

    // 检查消息是否存在且属于当前用户
    const message = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.userId, currentUser[0].id)
        )
      )
      .limit(1);

    if (!message[0]) {
      return NextResponse.json({ error: "消息不存在" }, { status: 404 });
    }

    // 标记消息为已读
    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(messages.id, messageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark message as read:", error);
    return NextResponse.json(
      { error: "标记消息为已读失败" },
      { status: 500 }
    );
  }
}
