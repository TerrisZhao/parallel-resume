"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { addToast } from "@heroui/toast";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

import { title } from "@/components/primitives";

// 订阅信息类型
interface Subscription {
  id: number;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  price: number;
}

// 积分交易记录类型
interface CreditTransaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

// 支付记录类型
interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function ManageSubscriptionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations("managePage");
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [credits, setCredits] = useState(0);
  const [creditTransactions, setCreditTransactions] = useState<
    CreditTransaction[]
  >([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (session) {
      fetchSubscriptionData();
    }
  }, [session]);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      // Fetch subscription status
      const statusRes = await fetch("/api/subscription/status");

      if (statusRes.ok) {
        const data = await statusRes.json();

        setCredits(data.credits || 0);
        if (data.subscription) {
          setSubscription(data.subscription);
        }
      }

      // Fetch credit transactions
      const transactionsRes = await fetch(
        "/api/subscription/credit-transactions",
      );

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();

        setCreditTransactions(data.transactions || []);
      }

      // Fetch payment records
      const paymentsRes = await fetch("/api/subscription/payments");

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();

        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error("Failed to fetch subscription data:", error);
      addToast({
        title: t("failedToLoadSubscription"),
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cancel subscription
  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      addToast({
        title: t("subscriptionEndNotice"),
        color: "success",
      });

      setShowCancelModal(false);
      await fetchSubscriptionData();
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      addToast({
        title: t("failedToCancelSubscription"),
        color: "danger",
      });
    } finally {
      setCanceling(false);
    }
  };

  // Reactivate subscription
  const handleReactivateSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/reactivate", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reactivate subscription");
      }

      addToast({
        title: t("autoRenewalReactivated"),
        color: "success",
      });

      await fetchSubscriptionData();
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
      addToast({
        title: t("failedToReactivate"),
        color: "danger",
      });
    }
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: "success" | "warning" | "danger" | "default" }
    > = {
      active: { label: t("success"), color: "success" },
      canceled: { label: t("status"), color: "danger" },
      past_due: { label: t("pending"), color: "warning" },
      trialing: { label: t("status"), color: "default" },
    };

    return statusMap[status] || { label: status, color: "default" };
  };

  // Get transaction type display
  const getTransactionTypeDisplay = (type: string) => {
    const typeMap: Record<
      string,
      { label: string; icon: React.ReactNode; color: string }
    > = {
      purchase: {
        label: t("purchase"),
        icon: <TrendingUp className="w-4 h-4" />,
        color: "text-success",
      },
      usage: {
        label: t("usage"),
        icon: <TrendingDown className="w-4 h-4" />,
        color: "text-danger",
      },
      refund: {
        label: t("refund"),
        icon: <RefreshCw className="w-4 h-4" />,
        color: "text-warning",
      },
      bonus: {
        label: t("bonus"),
        icon: <CheckCircle className="w-4 h-4" />,
        color: "text-primary",
      },
      subscription_grant: {
        label: t("subscriptionGrant"),
        icon: <CheckCircle className="w-4 h-4" />,
        color: "text-secondary",
      },
    };

    return (
      typeMap[type] || {
        label: type,
        icon: null,
        color: "text-default-500",
      }
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          isIconOnly
          size="sm"
          variant="flat"
          onPress={() => router.push("/subscription")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className={title({ size: "sm" })}>{t("title")}</h1>
          <p className="text-sm text-default-500 mt-1">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Credit Balance Card */}
      <Card className="mb-6 bg-gradient-to-r from-warning/10 to-warning/5">
        <CardBody className="flex flex-row items-center justify-between">
          <div>
            <p className="text-sm text-default-500 mb-1">
              {t("currentCreditBalance")}
            </p>
            <p className="text-3xl font-bold text-warning">{credits}</p>
          </div>
          <Button
            color="warning"
            variant="flat"
            onPress={() => router.push("/subscription")}
          >
            {t("buyCredits")}
          </Button>
        </CardBody>
      </Card>

      {/* 订阅信息卡片 */}
      {subscription && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-bold">{t("currentSubscription")}</h2>
          </CardHeader>
          <CardBody className="gap-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{subscription.plan}</h3>
                  <Chip
                    color={getStatusDisplay(subscription.status).color}
                    size="sm"
                    variant="flat"
                  >
                    {getStatusDisplay(subscription.status).label}
                  </Chip>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-default-500">{t("periodStart")}</p>
                    <p className="font-medium">
                      {new Date(
                        subscription.currentPeriodStart,
                      ).toLocaleDateString("en-US")}
                    </p>
                  </div>
                  <div>
                    <p className="text-default-500">{t("periodEnd")}</p>
                    <p className="font-medium">
                      {new Date(
                        subscription.currentPeriodEnd,
                      ).toLocaleDateString("en-US")}
                    </p>
                  </div>
                  <div>
                    <p className="text-default-500">{t("price")}</p>
                    <p className="font-medium">
                      ${subscription.price.toFixed(2)}/month
                    </p>
                  </div>
                  <div>
                    <p className="text-default-500">{t("autoRenewal")}</p>
                    <p className="font-medium">
                      {subscription.cancelAtPeriodEnd ? t("disabled") : t("enabled")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {t("subscriptionWillCancel")}
                  </p>
                  <p className="text-xs text-default-500 mt-1">
                    {t("subscriptionWillEnd")}{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                      "en-US",
                    )}
                  </p>
                </div>
              </div>
            )}

            <Divider />

            <div className="flex gap-2">
              {subscription.cancelAtPeriodEnd ? (
                <Button
                  color="success"
                  variant="flat"
                  onPress={handleReactivateSubscription}
                >
                  {t("reactivateAutoRenewal")}
                </Button>
              ) : (
                <Button
                  color="danger"
                  variant="flat"
                  onPress={() => setShowCancelModal(true)}
                >
                  {t("cancelSubscription")}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 积分交易记录 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-xl font-bold">{t("creditTransactionHistory")}</h2>
        </CardHeader>
        <CardBody>
          {creditTransactions.length === 0 ? (
            <p className="text-center text-default-500 py-8">
              {t("noTransactions")}
            </p>
          ) : (
            <Table removeWrapper aria-label="Credit transactions table">
              <TableHeader>
                <TableColumn>{t("date")}</TableColumn>
                <TableColumn>{t("type")}</TableColumn>
                <TableColumn>{t("description")}</TableColumn>
                <TableColumn>{t("amount")}</TableColumn>
                <TableColumn>{t("balance")}</TableColumn>
              </TableHeader>
              <TableBody>
                {creditTransactions.map((transaction) => {
                  const typeDisplay = getTransactionTypeDisplay(
                    transaction.type,
                  );

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.createdAt).toLocaleDateString(
                          "zh-CN",
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className={typeDisplay.color}>
                            {typeDisplay.icon}
                          </span>
                          <span>{typeDisplay.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <span
                          className={
                            transaction.amount > 0
                              ? "text-success"
                              : "text-danger"
                          }
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount}
                        </span>
                      </TableCell>
                      <TableCell>{transaction.balanceAfter}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* 支付记录 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">{t("paymentHistory")}</h2>
        </CardHeader>
        <CardBody>
          {payments.length === 0 ? (
            <p className="text-center text-default-500 py-8">
              {t("noPaymentRecords")}
            </p>
          ) : (
            <Table removeWrapper aria-label="Payment records table">
              <TableHeader>
                <TableColumn>{t("date")}</TableColumn>
                <TableColumn>{t("description")}</TableColumn>
                <TableColumn>{t("amount")}</TableColumn>
                <TableColumn>{t("status")}</TableColumn>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.createdAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell>
                      {payment.currency.toUpperCase()} $
                      {parseFloat(payment.amount.toString()).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        color={
                          payment.status === "succeeded"
                            ? "success"
                            : payment.status === "pending"
                              ? "warning"
                              : "danger"
                        }
                        size="sm"
                        variant="flat"
                      >
                        {payment.status === "succeeded"
                          ? t("success")
                          : payment.status === "pending"
                            ? t("pending")
                            : t("failed")}
                      </Chip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* 取消订阅确认模态框 */}
      <Modal isOpen={showCancelModal} onOpenChange={setShowCancelModal}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("confirmCancellation")}
              </ModalHeader>
              <ModalBody>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-warning flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-2">
                      {t("areYouSureCancel")}
                    </p>
                    <p className="text-sm text-default-500">
                      {t("cancelWarning")}
                    </p>
                    {subscription && (
                      <p className="text-sm text-default-500 mt-2">
                        {t("currentPeriodEnds")}{" "}
                        {new Date(
                          subscription.currentPeriodEnd,
                        ).toLocaleDateString("en-US")}
                      </p>
                    )}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  {t("keepSubscription")}
                </Button>
                <Button
                  color="danger"
                  isLoading={canceling}
                  onPress={handleCancelSubscription}
                >
                  {t("confirmCancel")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
