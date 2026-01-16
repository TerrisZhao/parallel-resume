"use client";

import type { SidebarItem } from "@/components/sidebar";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { Button } from "@heroui/button";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Spacer } from "@heroui/spacer";
import { Icon } from "@iconify/react";

import { Logo } from "@/components/logo";

const Sidebar = dynamic(() => import("@/components/sidebar"), {
  ssr: false,
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("admin");
  const { data: session, status } = useSession();
  const [selectedKey, setSelectedKey] = useState("users");
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 权限检查：只有 owner 可以访问
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    } else if (
      status === "authenticated" &&
      (session?.user as any)?.role !== "owner"
    ) {
      // 非 owner 用户重定向到首页
      router.push("/resume");
    }
  }, [status, session, router]);

  const items: SidebarItem[] = [
    {
      key: "users",
      href: "/admin/users",
      icon: "solar:users-group-rounded-bold-duotone",
      title: t("users"),
    },
    {
      key: "subscriptions",
      href: "/admin/subscriptions",
      icon: "solar:wallet-bold-duotone",
      title: t("subscriptions"),
    },
  ];

  useEffect(() => {
    if (pathname.startsWith("/admin/users")) {
      setSelectedKey("users");
    } else if (pathname.startsWith("/admin/subscriptions")) {
      setSelectedKey("subscriptions");
    }
  }, [pathname]);

  // 客户端挂载后立即初始化 sidebar 状态
  useEffect(() => {
    setIsClient(true);

    // 检查屏幕宽度
    const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;

    if (isSmallScreen) {
      // 小屏幕直接收起
      setIsSidebarCompact(true);
    } else {
      // 大屏幕检查 localStorage
      const saved = localStorage.getItem("sidebar-compact-admin");
      if (saved !== null) {
        setIsSidebarCompact(saved === "true");
      }
    }
  }, []);

  // 监听屏幕宽度变化，自动收起 sidebar（仅收起，不自动展开）
  useEffect(() => {
    if (!isClient) return;

    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        // 屏幕宽度 < md 时，自动收起
        setIsSidebarCompact(true);
        localStorage.setItem("sidebar-compact-admin", "true");
      }
      // 屏幕宽度 >= md 时，不做任何操作（不自动展开）
    };

    // 监听变化
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [isClient]);

  // 切换 sidebar 状态
  const toggleSidebar = () => {
    const newState = !isSidebarCompact;

    setIsSidebarCompact(newState);
    localStorage.setItem("sidebar-compact-admin", String(newState));
  };

  // 显示加载状态
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-default-500">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // 如果未认证或非 owner，不渲染内容
  if (
    status === "unauthenticated" ||
    (session?.user as any)?.role !== "owner"
  ) {
    return null;
  }

  return (
    <div className=" h-screen bg-gradient-to-br from-rose-400 via-fuchsia-500/50 to-indigo-500 dark:from-rose-400 dark:via-fuchsia-500/50 dark:to-indigo-500 p-3">
      <div className="flex h-full rounded-3xl overflow-hidden">
        <aside
          className={`relative flex h-full flex-shrink-0 flex-col border-r border-divider p-6 bg-background/95 dark:bg-background/80 backdrop-blur-lg backdrop-saturate-150 transition-all duration-300 ease-in-out ${
            isSidebarCompact ? "w-[88px]" : "w-72"
          }`}
        >
          {/* Logo and Toggle Button */}
          <div className="flex items-center justify-between">
            <div
              className={`flex cursor-pointer items-center gap-2 px-2 transition-opacity hover:opacity-80 ${
                isSidebarCompact ? "mx-auto" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => router.push("/")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push("/");
                }
              }}
            >
              <Logo />
              {!isSidebarCompact && (
                <div className="flex flex-col">
                  <span className="text-small font-bold">Parallel Resume</span>
                  <span className="text-tiny text-default-400">
                    {t("title")}
                  </span>
                </div>
              )}
            </div>
            {!isSidebarCompact && (
              <Button
                isIconOnly
                className="text-default-500 data-[hover=true]:text-foreground"
                size="sm"
                title={t("collapseSidebar")}
                variant="light"
                onPress={toggleSidebar}
              >
                <Icon
                  icon="solar:sidebar-minimalistic-bold-duotone"
                  width={20}
                />
              </Button>
            )}
          </div>

          {isSidebarCompact && (
            <div className="flex justify-center mt-4">
              <Button
                isIconOnly
                className="text-default-500 data-[hover=true]:text-foreground"
                size="sm"
                title={t("expandSidebar")}
                variant="light"
                onPress={toggleSidebar}
              >
                <Icon
                  icon="solar:sidebar-minimalistic-bold-duotone"
                  width={20}
                />
              </Button>
            </div>
          )}

          <Spacer y={8} />

          {/* Sidebar Navigation */}
          <ScrollShadow className="-mr-6 h-full max-h-full py-6 pr-6">
            <Sidebar
              defaultSelectedKey={selectedKey}
              isCompact={isSidebarCompact}
              items={items}
              onSelect={(key) => {
                const item = items.find((i) => i.key === key);

                if (item?.href) {
                  router.push(item.href);
                }
              }}
            />
          </ScrollShadow>

          <Spacer y={8} />

          {/* Bottom Actions */}
          <div className="mt-auto flex items-center gap-1 flex-col justify-center">
            <Button
              className={`text-small text-default-500 data-[hover=true]:text-foreground ${
                isSidebarCompact ? "justify-center" : "justify-start"
              }`}
              fullWidth={!isSidebarCompact}
              isIconOnly={isSidebarCompact}
              startContent={
                isSidebarCompact ? undefined : (
                  <Icon
                    className="text-default-500"
                    icon="solar:alt-arrow-left-bold-duotone"
                    width={24}
                  />
                )
              }
              title={isSidebarCompact ? t("backToDashboard") : undefined}
              variant="light"
              onPress={() => router.push("/resume")}
            >
              {isSidebarCompact ? (
                <Icon
                  className="text-default-500"
                  icon="solar:alt-arrow-left-bold-duotone"
                  width={24}
                />
              ) : (
                t("backToDashboard")
              )}
            </Button>
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* Content */}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
