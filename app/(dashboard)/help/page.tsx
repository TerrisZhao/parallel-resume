"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { usePageHeader } from "../use-page-header";

export default function HelpPage() {
  const t = useTranslations("help");
  const { setHeader } = usePageHeader();

  useEffect(() => {
    setHeader(
      <div className="px-6 py-4">
        <h1 className="text-2xl leading-[32px] font-bold">{t("title")}</h1>
      </div>,
    );

    return () => setHeader(null);
  }, [setHeader, t]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-12">
        <p className="text-default-500">{t("placeholder")}</p>
      </div>
    </div>
  );
}
