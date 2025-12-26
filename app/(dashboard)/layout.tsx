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

import { PageHeaderContext } from "./page-header-context";

import { Logo } from "@/components/logo";

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
  const { data: session } = useSession();
  const [selectedKey, setSelectedKey] = useState("resume");
  const [pageHeader, setPageHeader] = useState<ReactNode>(null);

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
    {
      key: "settings",
      href: "/settings",
      icon: "solar:settings-bold-duotone",
      title: t("settings"),
    },
  ];

  useEffect(() => {
    if (pathname.startsWith("/resume")) {
      setSelectedKey("resume");
    } else if (pathname.startsWith("/interviews")) {
      setSelectedKey("interviews");
    } else if (pathname.startsWith("/interview-prep")) {
      setSelectedKey("interview-prep");
    } else if (pathname.startsWith("/settings")) {
      setSelectedKey("settings");
    }
  }, [pathname]);

  return (
    <div className="flex h-screen">
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
              <Avatar
                isBordered
                name={session.user.name || undefined}
                size="sm"
                src={session.user.image || undefined}
              />
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
          <Button
            fullWidth
            className="justify-start text-default-500 data-[hover=true]:text-foreground"
            startContent={
              <Icon
                className="rotate-180 text-default-500"
                icon="solar:minus-circle-line-duotone"
                width={24}
              />
            }
            variant="light"
            onPress={() => signOut()}
          >
            {t("logout") || "Log Out"}
          </Button>
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
  );
}
