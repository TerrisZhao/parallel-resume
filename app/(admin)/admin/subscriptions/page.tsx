"use client";

import { useTranslations } from "next-intl";
import { Card, CardBody, CardHeader } from "@heroui/card";

export default function SubscriptionsPage() {
  const t = useTranslations("admin");

  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t("subscriptionManagement")}</h2>
        </CardHeader>
        <CardBody>
          <p className="text-default-500">{t("subscriptionManagementDesc")}</p>
          {/* TODO: 添加订阅列表和管理功能 */}
        </CardBody>
      </Card>
    </div>
  );
}
