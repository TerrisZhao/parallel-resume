"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Loading } from "@/components/loading";

interface SubscriptionPlan {
  id: number;
  nameEn: string;
  nameZh: string;
  priceId: string;
  price: number;
  interval: "month" | "year";
  featuresEn: string[];
  featuresZh: string[];
  isActive: boolean;
  isMostPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SubscriptionsPage() {
  const t = useTranslations("admin");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 编辑表单状态
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameZh, setEditNameZh] = useState("");
  const [editPriceId, setEditPriceId] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editInterval, setEditInterval] = useState<"month" | "year">("month");

  // 获取订阅计划列表
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/subscriptions");
      if (!response.ok) {
        throw new Error("Failed to fetch subscription plans");
      }
      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      addToast({
        title: t("fetchPlansFailed"),
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // 打开编辑模态框
  const handleEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setEditNameEn(plan.nameEn);
    setEditNameZh(plan.nameZh);
    setEditPriceId(plan.priceId);
    setEditPrice(plan.price.toString());
    setEditInterval(plan.interval);
    setShowEditModal(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selectedPlan) return;

    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) {
      addToast({
        title: t("invalidPrice"),
        color: "danger",
      });
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/subscriptions/${selectedPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameEn: editNameEn,
          nameZh: editNameZh,
          priceId: editPriceId,
          price,
          interval: editInterval,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update plan");
      }

      addToast({
        title: t("planUpdated"),
        color: "success",
      });

      setShowEditModal(false);
      fetchPlans();
    } catch (error: any) {
      console.error("Failed to update plan:", error);
      addToast({
        title: error.message || t("updatePlanFailed"),
        color: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 切换激活状态
  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${plan.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }

      addToast({
        title: plan.isActive ? t("planDeactivated") : t("planActivated"),
        color: "success",
      });

      fetchPlans();
    } catch (error: any) {
      console.error("Failed to update status:", error);
      addToast({
        title: error.message || t("updateStatusFailed"),
        color: "danger",
      });
    }
  };

  // 切换 Most Popular
  const handleToggleMostPopular = async (plan: SubscriptionPlan) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${plan.id}/popular`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMostPopular: !plan.isMostPopular }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update most popular");
      }

      addToast({
        title: plan.isMostPopular
          ? t("mostPopularRemoved")
          : t("mostPopularSet"),
        color: "success",
      });

      fetchPlans();
    } catch (error: any) {
      console.error("Failed to update most popular:", error);
      addToast({
        title: error.message || t("updateMostPopularFailed"),
        color: "danger",
      });
    }
  };

  const renderCell = useCallback(
    (plan: SubscriptionPlan, columnKey: React.Key) => {
      switch (columnKey) {
        case "name":
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-default-foreground">
                  {plan.nameZh || plan.nameEn}
                </span>
                {plan.isMostPopular && (
                  <Chip color="warning" size="sm" variant="flat">
                    {t("mostPopular")}
                  </Chip>
                )}
              </div>
              {plan.nameZh && plan.nameEn && (
                <span className="text-xs text-default-400">{plan.nameEn}</span>
              )}
            </div>
          );
        case "price":
          return (
            <div className="flex items-center gap-1">
              <span className="text-default-foreground font-medium">
                ${plan.price}
              </span>
              <span className="text-default-500 text-sm">
                /{plan.interval === "month" ? t("month") : t("year")}
              </span>
            </div>
          );
        case "priceId":
          return (
            <code className="text-xs text-default-600 bg-default-100 px-2 py-1 rounded">
              {plan.priceId}
            </code>
          );
        case "status":
          return (
            <Switch
              isSelected={plan.isActive}
              onValueChange={() => handleToggleActive(plan)}
              size="sm"
            />
          );
        case "mostPopular":
          return (
            <Switch
              isSelected={plan.isMostPopular}
              onValueChange={() => handleToggleMostPopular(plan)}
              size="sm"
              color="warning"
            />
          );
        case "actions":
          return (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => handleEdit(plan)}
            >
              <Icon
                icon="solar:pen-bold-duotone"
                width={20}
                className="text-default-500"
              />
            </Button>
          );
        default:
          return null;
      }
    },
    [t]
  );

  const columns = [
    { key: "name", label: t("planName") },
    { key: "price", label: t("price") },
    { key: "priceId", label: t("priceId") },
    { key: "status", label: t("status") },
    { key: "mostPopular", label: t("mostPopular") },
    { key: "actions", label: t("actions") },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* 顶部标题栏 - 与用户管理统一样式 */}
      <div className="flex-shrink-0 border-b border-divider bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl leading-[32px] font-bold">
              {t("subscriptionManagement")}
            </h1>
            <Chip className="text-default-500" size="sm" variant="flat">
              {plans.length}
            </Chip>
          </div>
          <Button
            color="primary"
            variant="light"
            startContent={<Icon icon="solar:refresh-bold-duotone" width={20} />}
            onPress={fetchPlans}
            isLoading={loading}
          >
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <Loading />
          ) : (
            <Table aria-label="Subscription plans table">
              <TableHeader columns={columns}>
                {(column) => (
                  <TableColumn key={column.key}>{column.label}</TableColumn>
                )}
              </TableHeader>
              <TableBody emptyContent={t("noPlans")} items={plans}>
                {(item) => (
                  <TableRow key={item.id}>
                    {(columnKey) => (
                      <TableCell>{renderCell(item, columnKey)}</TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* 编辑模态框 */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <ModalContent>
          <ModalHeader>{t("editPlan")}</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Input
                label={t("planNameEn")}
                value={editNameEn}
                onChange={(e) => setEditNameEn(e.target.value)}
                placeholder="Pro Plan"
              />
              <Input
                label={t("planNameZh")}
                value={editNameZh}
                onChange={(e) => setEditNameZh(e.target.value)}
                placeholder="专业版"
              />
              <Input
                label={t("priceId")}
                value={editPriceId}
                onChange={(e) => setEditPriceId(e.target.value)}
                description={t("priceIdDescription")}
              />
              <Input
                type="number"
                label={t("price")}
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                startContent={<span className="text-default-400">$</span>}
              />
              <div className="flex gap-2">
                <Button
                  className={editInterval === "month" ? "bg-primary text-white" : ""}
                  variant={editInterval === "month" ? "solid" : "bordered"}
                  onPress={() => setEditInterval("month")}
                >
                  {t("monthly")}
                </Button>
                <Button
                  className={editInterval === "year" ? "bg-primary text-white" : ""}
                  variant={editInterval === "year" ? "solid" : "bordered"}
                  onPress={() => setEditInterval("year")}
                >
                  {t("yearly")}
                </Button>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setShowEditModal(false)}
              isDisabled={actionLoading}
            >
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              onPress={handleSaveEdit}
              isLoading={actionLoading}
            >
              {t("confirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
