"use client";

import type { SidebarItem } from "@/components/sidebar";

import { useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Spacer } from "@heroui/spacer";
import { Icon } from "@iconify/react";
import { Card, CardBody } from "@heroui/card";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { useTheme } from "next-themes";

import { PageHeaderContext } from "./page-header-context";

import { Logo } from "@/components/logo";
import { SetPasswordModal } from "@/components/set-password-modal";

const Sidebar = dynamic(() => import("@/components/sidebar"), {
  ssr: false,
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("sidebar");
  const tCommon = useTranslations("common");
  const { data: session, update } = useSession();
  const [selectedKey, setSelectedKey] = useState("resume");
  const [pageHeader, setPageHeader] = useState<ReactNode>(null);
  const { theme, setTheme } = useTheme();
  const [currentLanguage, setCurrentLanguage] = useState<string>("system");
  const [hasSubscription, setHasSubscription] = useState(false);
  const [credits, setCredits] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [hasCheckedPassword, setHasCheckedPassword] = useState(false);

  // 根据用户角色动态生成 sidebar items
  const items: SidebarItem[] = [
    {
      key: "resume",
      href: "/resume",
      icon: "solar:documents-bold-duotone",
      title: t("resume"),
    },
    {
      key: "interviews",
      href: "/interviews",
      icon: "solar:case-round-bold-duotone",
      title: t("interviews"),
    },
    {
      key: "interview-prep",
      href: "/interview-prep",
      icon: "solar:clipboard-list-bold-duotone",
      title: t("interviewPrep"),
    },
    // 仅 owner 可以看到系统后台
    ...((session?.user as any)?.role === "owner"
      ? [
          {
            key: "admin",
            href: "/admin",
            icon: "solar:settings-minimalistic-bold-duotone",
            title: t("admin"),
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (pathname.startsWith("/resume")) {
      setSelectedKey("resume");
    } else if (pathname.startsWith("/interviews")) {
      setSelectedKey("interviews");
    } else if (pathname.startsWith("/interview-prep")) {
      setSelectedKey("interview-prep");
    } else if (pathname.startsWith("/admin")) {
      setSelectedKey("admin");
    } else if (pathname.startsWith("/settings")) {
      setSelectedKey("settings");
    } else if (pathname.startsWith("/help")) {
      setSelectedKey("help");
    } else if (pathname.startsWith("/subscription")) {
      setSelectedKey("subscription");
    } else {
      setSelectedKey("");
    }
  }, [pathname]);

  useEffect(() => {
    if (session?.user && (session.user as any)?.preferredLanguage) {
      setCurrentLanguage((session.user as any).preferredLanguage);
    }
  }, [session?.user]);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const response = await fetch("/api/subscription/status");

        if (response.ok) {
          const data = await response.json();

          setCredits(data.credits || 0);
          setHasSubscription(
            data.subscription &&
              (data.subscription.status === "active" ||
                data.subscription.status === "trialing"),
          );
        }
      } catch (error) {
        console.error("Failed to fetch subscription status:", error);
      }
    };

    if (session) {
      fetchSubscriptionStatus();
    }
  }, [session]);

  // 检查用户是否需要设置密码（仅首次登录）
  useEffect(() => {
    const checkPasswordSetup = async () => {
      if (!session || hasCheckedPassword) {
        return;
      }

      try {
        const response = await fetch("/api/user/profile");

        if (response.ok) {
          const data = await response.json();
          const user = data.user;

          // 如果用户没有完成首次登录设置，且没有密码（Google登录或测试账号）
          if (!user.firstLoginCompleted) {
            setShowSetPasswordModal(true);
          }
        }
      } catch (error) {
        console.error("Failed to check password setup:", error);
      } finally {
        setHasCheckedPassword(true);
      }
    };

    checkPasswordSetup();
  }, [session, hasCheckedPassword]);

  const handleThemeToggle = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";

    setTheme(newTheme);
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeMode: newTheme }),
      });
      await update({
        ...session,
        user: { ...session?.user, themeMode: newTheme },
      });
    } catch (error) {
      console.error("Failed to update theme:", error);
    }
  };

  const handleLanguageToggle = async () => {
    const languages = ["system", "en", "zh"];
    const currentIndex = languages.indexOf(currentLanguage);
    const newLanguage = languages[(currentIndex + 1) % languages.length];

    setCurrentLanguage(newLanguage);
    try {
      await fetch("/api/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLanguage }),
      });
      await update({
        ...session,
        user: { ...session?.user, preferredLanguage: newLanguage },
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to update language:", error);
    }
  };

  return (
    <div className=" h-screen bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 dark:from-rose-600 dark:via-fuchsia-700 dark:to-indigo-700 p-4">
      <div className="flex h-full rounded-3xl overflow-hidden bg-background">
        <aside className="relative flex h-full w-72 flex-shrink-0 flex-col border-r border-divider p-6">
          {/* Logo */}
          <div
            className="flex cursor-pointer items-center gap-2 px-2 transition-opacity hover:opacity-80"
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
            <span className="text-small font-bold">Parallel Resume</span>
          </div>

          <Spacer y={8} />

          {/* User Info */}
          {session?.user && (
            <>
              <div className="flex items-center gap-3 px-2">
                <div className="relative">
                  <Avatar
                    isBordered
                    classNames={{
                      base: hasSubscription ? "ring-2 ring-warning" : "",
                    }}
                    name={session.user.name || undefined}
                    size="sm"
                    src={session.user.image || undefined}
                  />
                  {hasSubscription && (
                    <div className="absolute -top-0.5 -right-0.5 bg-warning rounded-full p-0.5">
                      <Icon
                        className="text-warning-foreground"
                        icon="solar:crown-bold-duotone"
                        width={12}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <p className="text-small font-medium text-default-600">
                    {session.user.name || session.user.email}
                  </p>
                  <p className="text-tiny text-default-400">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <Spacer y={6} />
            </>
          )}

          {/* Sidebar Navigation */}
          <ScrollShadow className="-mr-6 h-full max-h-full py-6 pr-6">
            <Sidebar
              defaultSelectedKey={selectedKey}
              items={items}
              onSelect={(key) => {
                const item = items.find((i) => i.key === key);

                if (item?.href) {
                  router.push(item.href);
                }
              }}
            />
            <Spacer y={2} />
          </ScrollShadow>

          <Spacer y={8} />

          {/* Bottom Actions */}
          <div className="mt-auto flex flex-col">
            {!hasSubscription && credits === 0 && (
              <Card className="relative mx-2 mb-8 overflow-visible" shadow="sm">
                <CardBody className="items-center pb-8 pt-5 text-center">
                  <h3 className="text-medium font-medium text-default-700">
                    {t("upgradeToPro")}
                    <span aria-label="rocket-emoji" className="ml-2" role="img">
                      🚀
                    </span>
                  </h3>
                  <p className="p-4 text-small text-default-500">
                    {t("upgradeDescription")}
                  </p>
                </CardBody>
                <div className="absolute -bottom-5 left-0 right-0 flex justify-center">
                  <Button
                    className="px-10 shadow-md"
                    color="primary"
                    radius="full"
                    variant="shadow"
                    onPress={() => router.push("/subscription")}
                  >
                    {t("upgrade")}
                  </Button>
                </div>
              </Card>
            )}
            {(hasSubscription || credits > 0) && (
              <Button
                fullWidth
                className={`justify-start mb-1 ${
                  selectedKey === "subscription"
                    ? "bg-default-100 text-foreground"
                    : "text-default-500 data-[hover=true]:text-foreground"
                }`}
                startContent={
                  <Icon
                    className={
                      selectedKey === "subscription"
                        ? "text-primary"
                        : "text-default-500"
                    }
                    icon="solar:crown-bold-duotone"
                    width={24}
                  />
                }
                variant="light"
                onPress={() => router.push("/subscription/manage")}
              >
                {t("subscription")}
              </Button>
            )}
            <Button
              fullWidth
              className={`justify-start ${
                selectedKey === "settings"
                  ? "bg-default-100 text-foreground"
                  : "text-default-500 data-[hover=true]:text-foreground"
              }`}
              startContent={
                <Icon
                  className={
                    selectedKey === "settings"
                      ? "text-primary"
                      : "text-default-500"
                  }
                  icon="solar:settings-bold-duotone"
                  width={24}
                />
              }
              variant="light"
              onPress={() => router.push("/settings")}
            >
              {t("settings")}
            </Button>
            <Button
              fullWidth
              className={`justify-start ${
                selectedKey === "help"
                  ? "bg-default-100 text-foreground"
                  : "text-default-500 data-[hover=true]:text-foreground"
              }`}
              startContent={
                <Icon
                  className={
                    selectedKey === "help" ? "text-primary" : "text-default-500"
                  }
                  icon="solar:question-circle-bold-duotone"
                  width={24}
                />
              }
              variant="light"
              onPress={() => router.push("/help")}
            >
              {t("help")}
            </Button>
            <Spacer y={2} />
            <div className="flex items-center justify-between">
              <Button
                isIconOnly
                className="text-default-500 data-[hover=true]:text-foreground"
                variant="light"
                onPress={() => setShowLogoutModal(true)}
              >
                <Icon icon="solar:logout-2-bold-duotone" width={24} />
              </Button>
              <Button
                isIconOnly
                className="text-default-500 data-[hover=true]:text-foreground"
                variant="light"
                onPress={handleLanguageToggle}
              >
                <Icon icon="solar:global-bold-duotone" width={24} />
              </Button>
              <Button
                isIconOnly
                className="text-default-500 data-[hover=true]:text-foreground"
                variant="light"
                onPress={handleThemeToggle}
              >
                <Icon
                  icon={
                    theme === "dark"
                      ? "solar:moon-bold-duotone"
                      : "solar:sun-bold-duotone"
                  }
                  width={24}
                />
              </Button>
            </div>
          </div>
        </aside>
        <PageHeaderContext.Provider value={{ setHeader: setPageHeader }}>
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* 固定顶部横栏 */}
            {pageHeader && (
              <div className="flex-shrink-0 border-b border-divider bg-background">
                {pageHeader}
              </div>
            )}
            {/* 可滚动内容区 */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </main>
        </PageHeaderContext.Provider>
      </div>
      <Modal isOpen={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("logout")}
              </ModalHeader>
              <ModalBody>
                <p>{t("logoutConfirm")}</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {tCommon("cancel")}
                </Button>
                <Button
                  color="danger"
                  onPress={() => {
                    onClose();
                    signOut();
                  }}
                >
                  {t("logout")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <SetPasswordModal
        isOpen={showSetPasswordModal}
        onClose={() => setShowSetPasswordModal(false)}
        onSuccess={() => {
          // 刷新用户数据
          if (update) {
            update();
          }
        }}
      />
    </div>
  );
}
