"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Globe } from "lucide-react";

export const LanguageSwitch = () => {
  const locale = useLocale();
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();

  const changeLanguage = async (newLocale: string) => {
    startTransition(async () => {
      try {
        await fetch("/api/user/locale", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ locale: newLocale }),
        });
        window.location.reload();
      } catch (error) {
        console.error("Failed to change language:", error);
      }
    });
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button isIconOnly isLoading={isPending} variant="light">
          <Globe size={20} />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Language selection"
        selectedKeys={[locale]}
        onAction={(key) => changeLanguage(key as string)}
      >
        <DropdownItem key="en" startContent="🇺🇸">
          English
        </DropdownItem>
        <DropdownItem key="zh" startContent="🇨🇳">
          中文
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};
