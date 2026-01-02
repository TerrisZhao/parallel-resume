import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { OAuth2Client } from "google-auth-library";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { users, loginHistory } from "@/lib/db/schema";
import { parseUserAgent } from "@/lib/utils/device-parser";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * 记录登录历史
 */
async function recordLoginHistory(
  userId: number,
  userAgent: string,
  ipAddress: string | null,
) {
  try {
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    await db.insert(loginHistory).values({
      userId,
      ipAddress,
      userAgent,
      deviceType,
      browser,
      os,
      isSuccessful: true,
    });
  } catch (error) {
    console.error("记录登录历史失败:", error);
  }
}

/**
 * Chrome 插件登录端点
 * 接收 Google OAuth token，验证后返回 JWT
 */
export async function POST(request: NextRequest) {
  try {
    const { googleToken } = await request.json();

    if (!googleToken) {
      return NextResponse.json(
        { error: "Missing Google token" },
        { status: 400 },
      );
    }

    // 验证 Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 提取用户信息
    const email = payload.email;
    const name = payload.name || "";
    const providerId = payload.sub;

    // 查找现有用户
    const existingUser = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    let userId: number;
    let userRole: string;
    let userName: string | null;

    if (existingUser.length === 0) {
      // 创建新用户
      const newUser = await db
        .insert(users)
        .values({
          email,
          name: name || null,
          provider: "google",
          providerId,
          passwordHash: null,
          role: "user",
        })
        .returning({ id: users.id, name: users.name, role: users.role });

      userId = newUser[0].id;
      userRole = newUser[0].role;
      userName = newUser[0].name;
    } else {
      const user = existingUser[0];

      userId = user.id;
      userRole = user.role;
      userName = user.name;

      // 更新用户的 provider 信息（如果之前是密码登录）
      if (user.provider !== "google") {
        await db
          .update(users)
          .set({
            provider: "google",
            providerId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
    }

    // 记录登录历史
    const userAgent = request.headers.get("user-agent") || "Chrome Extension";
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const cfConnectingIP = request.headers.get("cf-connecting-ip");

    let ipAddress = null;

    if (cfConnectingIP) ipAddress = cfConnectingIP;
    else if (realIP) ipAddress = realIP;
    else if (forwarded) ipAddress = forwarded.split(",")[0].trim();

    await recordLoginHistory(userId, userAgent, ipAddress);

    // 生成 JWT
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const token = await new SignJWT({
      userId,
      email,
      role: userRole,
      name: userName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(userId))
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        name: userName,
        role: userRole,
      },
    });
  } catch (error: any) {
    console.error("Extension login error:", error);

    if (error.message?.includes("Token used too late")) {
      return NextResponse.json(
        { error: "Token expired. Please try again." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}
