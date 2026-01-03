import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { messages, users } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

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

    // 获取分页参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const offset = (page - 1) * pageSize;

    // 获取用户的消息列表
    const userMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, currentUser[0].id))
      .orderBy(desc(messages.createdAt))
      .limit(pageSize)
      .offset(offset);

    // 格式化消息数据
    const formattedMessages = userMessages.map((msg: typeof userMessages[number]) => ({
      id: msg.id,
      type: msg.type,
      title: msg.title,
      content: msg.content,
      isRead: msg.isRead,
      metadata: msg.metadata,
      relatedId: msg.relatedId,
      relatedType: msg.relatedType,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString() || null,
    }));

    return NextResponse.json({
      messages: formattedMessages,
      page,
      pageSize,
      total: userMessages.length,
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: "获取消息失败" },
      { status: 500 }
    );
  }
}
