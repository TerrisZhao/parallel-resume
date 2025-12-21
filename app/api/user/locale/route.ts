import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();

    // 验证 locale 值
    if (!["system", "en", "zh"].includes(locale)) {
      return NextResponse.json(
        { error: "Invalid locale value" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();

    // 处理 "system" 选项
    if (locale === "system") {
      const acceptLanguage = request.headers.get("accept-language");
      const detectedLocale = acceptLanguage?.includes("zh") ? "zh" : "en";

      cookieStore.set("NEXT_LOCALE", detectedLocale, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: "/",
      });
    } else {
      cookieStore.set("NEXT_LOCALE", locale, {
        maxAge: 365 * 24 * 60 * 60,
        path: "/",
      });
    }

    // 如果已登录，更新数据库
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      await db
        .update(users)
        .set({
          preferredLanguage: locale,
          updatedAt: new Date(),
        })
        .where(eq(users.id, parseInt(session.user.id)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update locale:", error);

    return NextResponse.json(
      { error: "Failed to update locale" },
      { status: 500 },
    );
  }
}
