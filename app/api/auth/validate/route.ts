import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { eq, isNull, and } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";

/**
 * JWT Token 验证端点
 * 用于验证 Chrome 插件的 Bearer token 是否有效
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.substring(7);

  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // 检查用户是否仍然存在且未被删除
    const userId = parseInt(payload.sub || "0");
    if (userId) {
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (user.length === 0) {
        return NextResponse.json(
          { error: "User not found or inactive" },
          { status: 401 }
        );
      }

      if (!user[0].isActive) {
        return NextResponse.json(
          { error: "User account is inactive" },
          { status: 403 }
        );
      }

      return NextResponse.json({
        valid: true,
        userId: user[0].id,
        email: user[0].email,
        name: user[0].name,
        role: user[0].role,
      });
    }

    return NextResponse.json({
      valid: true,
      userId: payload.userId,
      email: payload.email,
    });
  } catch (error: any) {
    console.error("Token validation error:", error);

    if (error.code === "ERR_JWT_EXPIRED") {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
