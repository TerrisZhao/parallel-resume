"use client";

import { useTranslations } from "next-intl";
import { Card, CardBody, CardHeader } from "@heroui/card";

export default function UsersPage() {
  const t = useTranslations("admin");

  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t("userManagement")}</h2>
        </CardHeader>
        <CardBody>
          <p className="text-default-500">{t("userManagementDesc")}</p>
          {/* TODO: 添加用户列表和管理功能 */}
        </CardBody>
      </Card>
    </div>
  );
}
