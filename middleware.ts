import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";

// 辅助函数：检测语言
function detectLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language");

  if (acceptLanguage?.includes("zh")) return "zh";
  if (acceptLanguage?.includes("en")) return "en";

  return "en"; // 默认英文
}

// 辅助函数：为 response 设置语言 cookie
function setLocaleCookie(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  const currentLocale = request.cookies.get("NEXT_LOCALE")?.value;

  if (!currentLocale) {
    const detectedLocale = detectLocale(request);

    response.cookies.set("NEXT_LOCALE", detectedLocale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 根路径首页：完全公开
  if (path === "/") {
    return setLocaleCookie(NextResponse.next(), request);
  }

  // 打印页面特殊处理：只允许 PDF 生成访问，浏览器访问重定向
  if (path.startsWith("/resume/print/")) {
    const isPdfGeneration = request.nextUrl.searchParams.get("_pdf") === "true";

    if (!isPdfGeneration) {
      // 浏览器直接访问，重定向到简历编辑页面
      const resumeId = path.split("/").pop();

      return setLocaleCookie(
        NextResponse.redirect(new URL(`/resume/${resumeId}`, request.url)),
        request,
      );
    }

    // PDF 生成请求，允许访问
    return setLocaleCookie(NextResponse.next(), request);
  }

  // 公开路径，无需认证（前缀匹配）
  const publicPaths = [
    "/sign-in",
    "/api/auth",
    "/api/auth/mobile-login",
    "/api/subscription/webhook",
  ];

  const isPublicPath = publicPaths.some((publicPath) =>
    path.startsWith(publicPath),
  );

  if (isPublicPath) {
    return setLocaleCookie(NextResponse.next(), request);
  }

  // API 路由的认证处理
  if (path.startsWith("/api/")) {
    // 尝试从 Authorization header 获取 token（移动端）
    const authHeader = request.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const secret = new TextEncoder().encode(
          process.env.NEXTAUTH_SECRET || "your-secret-key-change-this",
        );
        const { payload } = await jwtVerify(token, secret);

        // Token 验证成功，添加用户信息到 headers
        const requestHeaders = new Headers(request.headers);

        requestHeaders.set("x-user-id", String(payload.userId));
        requestHeaders.set("x-user-email", String(payload.email));
        requestHeaders.set("x-user-role", String(payload.role));

        return setLocaleCookie(
          NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          }),
          request,
        );
      } catch (error) {
        console.error("JWT verification failed:", error);

        return setLocaleCookie(
          NextResponse.json(
            { error: "未授权: Token 无效或已过期" },
            { status: 401 },
          ),
          request,
        );
      }
    }

    // 尝试使用 NextAuth session（网页端）
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return setLocaleCookie(
        NextResponse.json({ error: "未授权" }, { status: 401 }),
        request,
      );
    }

    return setLocaleCookie(NextResponse.next(), request);
  }

  // 页面路由的认证处理（网页端）
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return setLocaleCookie(
      NextResponse.redirect(new URL("/sign-in", request.url)),
      request,
    );
  }

  return setLocaleCookie(NextResponse.next(), request);
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (网站图标)
     * - public 文件夹中的文件
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
