import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { messages, users } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

/**
 * 获取用户语言偏好
 */
function getUserLocale(
  request: NextRequest,
  userPreferredLanguage?: string | null,
): "en" | "zh" {
  // 如果用户设置了语言偏好，优先使用
  if (userPreferredLanguage === "en" || userPreferredLanguage === "zh") {
    return userPreferredLanguage;
  }

  // 从 cookie 获取
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale === "en" || cookieLocale === "zh") {
    return cookieLocale;
  }

  // 处理 "system" 选项，从 Accept-Language header 检测
  if (userPreferredLanguage === "system") {
    const acceptLanguage = request.headers.get("accept-language");
    if (acceptLanguage?.includes("zh")) {
      return "zh";
    }
  }

  // 从 Accept-Language header 检测
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage?.includes("zh")) {
    return "zh";
  }

  // 默认英文
  return "en";
}

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

    // 获取用户语言偏好
    const locale = getUserLocale(
      request,
      currentUser[0].preferredLanguage || null,
    );

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

    // 格式化消息数据，根据用户语言偏好提取对应语言的内容
    const formattedMessages = userMessages.map((msg: typeof userMessages[number]) => {
      // 处理多语言 title 和 content
      const titleObj = msg.title as { zh: string; en: string } | string;
      const contentObj = msg.content as { zh: string; en: string } | string;

      // 兼容旧数据：如果是字符串，直接使用；如果是对象，根据语言选择
      const title =
        typeof titleObj === "string"
          ? titleObj
          : titleObj?.[locale] || titleObj?.zh || titleObj?.en || "";
      const content =
        typeof contentObj === "string"
          ? contentObj
          : contentObj?.[locale] || contentObj?.zh || contentObj?.en || "";

      return {
        id: msg.id,
        type: msg.type,
        title,
        content,
        isRead: msg.isRead,
        metadata: msg.metadata,
        relatedId: msg.relatedId,
        relatedType: msg.relatedType,
        createdAt: msg.createdAt.toISOString(),
        readAt: msg.readAt?.toISOString() || null,
      };
    });

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
