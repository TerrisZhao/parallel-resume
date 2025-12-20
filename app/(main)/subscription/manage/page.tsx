"use client";

import { useSession } from "next-auth/react";
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
        title: "Failed to load subscription info, please refresh",
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
        title: "Subscription will end at the current period",
        color: "success",
      });

      setShowCancelModal(false);
      await fetchSubscriptionData();
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      addToast({
        title: "Failed to cancel subscription, please try again",
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
        title: "Subscription auto-renewal reactivated",
        color: "success",
      });

      await fetchSubscriptionData();
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
      addToast({
        title: "Failed to reactivate subscription, please try again",
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
      active: { label: "Active", color: "success" },
      canceled: { label: "Canceled", color: "danger" },
      past_due: { label: "Past Due", color: "warning" },
      trialing: { label: "Trial", color: "default" },
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
        label: "Purchase",
        icon: <TrendingUp className="w-4 h-4" />,
        color: "text-success",
      },
      usage: {
        label: "Usage",
        icon: <TrendingDown className="w-4 h-4" />,
        color: "text-danger",
      },
      refund: {
        label: "Refund",
        icon: <RefreshCw className="w-4 h-4" />,
        color: "text-warning",
      },
      bonus: {
        label: "Bonus",
        icon: <CheckCircle className="w-4 h-4" />,
        color: "text-primary",
      },
      subscription_grant: {
        label: "Subscription Grant",
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
          <h1 className={title({ size: "sm" })}>Manage Subscription</h1>
          <p className="text-sm text-default-500 mt-1">
            Manage your subscription and view account details
          </p>
        </div>
      </div>

      {/* Credit Balance Card */}
      <Card className="mb-6 bg-gradient-to-r from-warning/10 to-warning/5">
        <CardBody className="flex flex-row items-center justify-between">
          <div>
            <p className="text-sm text-default-500 mb-1">
              Current Credit Balance
            </p>
            <p className="text-3xl font-bold text-warning">{credits} Credits</p>
          </div>
          <Button
            color="warning"
            variant="flat"
            onPress={() => router.push("/subscription")}
          >
            Buy Credits
          </Button>
        </CardBody>
      </Card>

      {/* 订阅信息卡片 */}
      {subscription && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-bold">Current Subscription</h2>
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
                    <p className="text-default-500">Period Start</p>
                    <p className="font-medium">
                      {new Date(
                        subscription.currentPeriodStart,
                      ).toLocaleDateString("en-US")}
                    </p>
                  </div>
                  <div>
                    <p className="text-default-500">Period End</p>
                    <p className="font-medium">
                      {new Date(
                        subscription.currentPeriodEnd,
                      ).toLocaleDateString("en-US")}
                    </p>
                  </div>
                  <div>
                    <p className="text-default-500">Price</p>
                    <p className="font-medium">
                      ${subscription.price.toFixed(2)}/month
                    </p>
                  </div>
                  <div>
                    <p className="text-default-500">Auto-Renewal</p>
                    <p className="font-medium">
                      {subscription.cancelAtPeriodEnd ? "Disabled" : "Enabled"}
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
                    Subscription will be canceled at period end
                  </p>
                  <p className="text-xs text-default-500 mt-1">
                    Your subscription will end on{" "}
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
                  Reactivate Auto-Renewal
                </Button>
              ) : (
                <Button
                  color="danger"
                  variant="flat"
                  onPress={() => setShowCancelModal(true)}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 积分交易记录 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-xl font-bold">Credit Transaction History</h2>
        </CardHeader>
        <CardBody>
          {creditTransactions.length === 0 ? (
            <p className="text-center text-default-500 py-8">
              No transactions yet
            </p>
          ) : (
            <Table removeWrapper aria-label="Credit transactions table">
              <TableHeader>
                <TableColumn>Date</TableColumn>
                <TableColumn>Type</TableColumn>
                <TableColumn>Description</TableColumn>
                <TableColumn>Amount</TableColumn>
                <TableColumn>Balance</TableColumn>
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
          <h2 className="text-xl font-bold">Payment History</h2>
        </CardHeader>
        <CardBody>
          {payments.length === 0 ? (
            <p className="text-center text-default-500 py-8">
              No payment records
            </p>
          ) : (
            <Table removeWrapper aria-label="Payment records table">
              <TableHeader>
                <TableColumn>Date</TableColumn>
                <TableColumn>Description</TableColumn>
                <TableColumn>Amount</TableColumn>
                <TableColumn>Status</TableColumn>
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
                          ? "Success"
                          : payment.status === "pending"
                            ? "Pending"
                            : "Failed"}
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
                Confirm Cancellation
              </ModalHeader>
              <ModalBody>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-warning flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-2">
                      Are you sure you want to cancel?
                    </p>
                    <p className="text-sm text-default-500">
                      You&apos;ll retain access until the end of your current
                      billing period. After that, you won&apos;t be able to use
                      premium features.
                    </p>
                    {subscription && (
                      <p className="text-sm text-default-500 mt-2">
                        Current period ends on:{" "}
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
                  Keep Subscription
                </Button>
                <Button
                  color="danger"
                  isLoading={canceling}
                  onPress={handleCancelSubscription}
                >
                  Confirm Cancel
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
