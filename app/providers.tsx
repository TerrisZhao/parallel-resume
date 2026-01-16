"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ToastProvider } from "@heroui/toast";
import { useLocale } from "next-intl";
import { I18nProvider } from "@react-aria/i18n";

import { ClientSessionProvider } from "@/components/client-session-provider";
import { ClientThemeProvider } from "@/components/client-theme-provider";
import { ThemeColorUpdater } from "@/components/theme-color-updater";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();
  const locale = useLocale();

  // 将 next-intl locale 映射到 React Aria 支持的 locale
  const ariaLocale = locale === "zh" ? "zh-CN" : "en-US";

  return (
    <ClientSessionProvider>
      <I18nProvider locale={ariaLocale}>
        <HeroUIProvider navigate={router.push}>
          <ClientThemeProvider themeProps={themeProps as any}>
            <ThemeColorUpdater />
            <ToastProvider placement="top-right" />
            {children}
          </ClientThemeProvider>
        </HeroUIProvider>
      </I18nProvider>
    </ClientSessionProvider>
  );
}
