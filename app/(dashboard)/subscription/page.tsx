"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { addToast } from "@heroui/toast";
import {
  Check,
  Sparkles,
  Zap,
  CreditCard,
  Calendar,
  Gift,
  Crown,
} from "lucide-react";

import { usePageHeader } from "../use-page-header";

import { title } from "@/components/primitives";

// 数据库套餐类型定义
interface DBPlan {
  id: number;
  name: string;
  type: "free" | "credits" | "subscription";
  price: number;
  credits: number | null;
  interval: string | null;
  intervalCount: number | null;
  features: string[];
  stripePriceId: string | null;
  description: string | null;
  displayOrder: number;
  isPopular: boolean;
}

// UI展示套餐类型定义
interface Plan extends DBPlan {
  popular?: boolean;
  icon: React.ReactNode;
  buttonText: string;
  buttonColor?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger";
}

// 用户订阅信息类型
interface UserSubscription {
  credits: number;
  subscriptionStatus?: string;
  subscriptionEndDate?: string;
  plan?: string;
}

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const t = useTranslations("subscriptionPage");
  const tSub = useTranslations("subscription");
  const [userSubscription, setUserSubscription] =
    useState<UserSubscription | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  // 获取套餐列表
  useEffect(() => {
    fetchPlans();
  }, []);

  // Fetch user subscription info
  useEffect(() => {
    if (session) {
      fetchUserSubscription();
    }
  }, [session]);

  // 从数据库获取套餐并增强UI数据
  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const response = await fetch("/api/subscription/plans");

      if (!response.ok) {
        throw new Error("Failed to fetch plans");
      }

      const data = await response.json();
      const dbPlans: DBPlan[] = data.plans;

      // 增强套餐数据，添加UI所需的字段
      const enhancedPlans: Plan[] = dbPlans.map((plan) => {
        // 根据类型设置图标
        let icon: React.ReactNode;

        if (plan.type === "free") {
          icon = <Gift className="w-6 h-6" />;
        } else if (plan.type === "credits") {
          icon = <Zap className="w-6 h-6" />;
        } else {
          icon = <Crown className="w-6 h-6" />;
        }

        // 根据类型设置按钮文本
        let buttonText: string;

        if (plan.type === "free") {
          buttonText = tSub("buttons.currentPlan");
        } else if (plan.type === "credits") {
          buttonText = tSub("buttons.buyNow");
        } else {
          buttonText = tSub("buttons.subscribeNow");
        }

        // 根据类型设置按钮颜色
        let buttonColor:
          | "default"
          | "primary"
          | "secondary"
          | "success"
          | "warning"
          | "danger" = "default";

        if (plan.type === "free") {
          buttonColor = "default";
        } else if (plan.type === "credits") {
          buttonColor = "warning";
        } else {
          buttonColor = "secondary";
        }

        return {
          ...plan,
          icon,
          buttonText,
          buttonColor,
          popular: plan.isPopular, // 直接使用数据库的 isPopular 字段
        };
      });

      setPlans(enhancedPlans);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      addToast({
        title: t("failedToLoadPlans") || "Failed to load plans",
        color: "danger",
      });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // Set page header
  useEffect(() => {
    setHeader(
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <h1 className="text-2xl leading-[32px] font-bold">{t("title")}</h1>
        {userSubscription && (
          <div className="flex items-center gap-4">
            <Button
              color="primary"
              size="sm"
              variant="flat"
              onPress={() => router.push("/subscription/manage")}
            >
              {t("manageSubscription")}
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/20">
                <Sparkles className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-default-500">
                  {t("currentCreditBalance")}
                </p>
                <p className="text-lg font-bold text-warning">
                  {userSubscription.credits}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>,
    );

    return () => setHeader(null);
  }, [setHeader, t, userSubscription, router]);

  const fetchUserSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/status");

      if (response.ok) {
        const data = await response.json();

        setUserSubscription(data);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    }
  };

  // Handle plan purchase/subscription
  const handleSelectPlan = async (plan: Plan) => {
    if (!session) {
      addToast({
        title: t("signInToPurchase"),
        color: "danger",
      });
      router.push("/sign-in");

      return;
    }

    if (plan.type === "free") {
      return;
    }

    setLoadingPlanId(plan.id.toString());

    try {
      // Call backend API to create Stripe Checkout session
      const response = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Checkout creation failed:", errorData);
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout page
      window.location.href = url;
    } catch (error) {
      console.error("Failed to process plan selection:", error);
      const errorMessage = error instanceof Error ? error.message : t("failedToCreateCheckout");
      addToast({
        title: errorMessage,
        color: "danger",
      });
    } finally {
      setLoadingPlanId(null);
    }
  };

  // Render plan card
  const renderPlanCard = (plan: Plan) => {
    // 用户是否有活跃订阅
    const hasActiveSubscription = userSubscription?.subscriptionStatus === "active";

    // 免费套餐是当前套餐的条件：是免费套餐且用户没有活跃订阅
    const isCurrentPlan = plan.type === "free" && !hasActiveSubscription;

    // 订阅套餐是否是当前订阅
    const isSubscribed =
      plan.type === "subscription" && hasActiveSubscription;

    return (
      <Card
        key={plan.id}
        className={`relative p-3 overflow-visible ${
          plan.popular
            ? "bg-primary shadow-primary/20 shadow-2xl scale-105"
            : plan.type === "subscription"
              ? "bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 dark:from-rose-600 dark:via-fuchsia-700 dark:to-indigo-700 shadow-2xl"
              : "border-medium border-default-100 bg-transparent"
        }`}
        shadow="none"
      >
        {plan.popular && (
          <Chip
            classNames={{
              base: "absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-foreground shadow-large border-medium border-primary",
              content: "font-medium text-primary",
            }}
            color="primary"
          >
            {t("mostPopular")}
          </Chip>
        )}

        <CardHeader className="flex flex-col items-start gap-2 pb-6 relative z-10">
          <h2
            className={`text-xl font-medium ${
              plan.popular || plan.type === "subscription" ? "text-white" : ""
            }`}
          >
            {plan.name}
          </h2>
          <p
            className={`text-medium ${
              plan.popular || plan.type === "subscription"
                ? "text-white/80"
                : "text-default-500"
            }`}
          >
            {plan.description}
          </p>
        </CardHeader>

        <Divider
          className={`${plan.popular || plan.type === "subscription" ? "bg-white/20" : ""} relative z-10`}
        />

        <CardBody className="gap-8 pt-6 relative z-10">
          {/* 价格展示 */}
          <p className="flex items-baseline gap-1">
            <span
              className={`inline bg-linear-to-br bg-clip-text text-4xl leading-7 font-semibold tracking-tight ${
                plan.popular || plan.type === "subscription"
                  ? "text-white"
                  : "from-foreground to-foreground-600 text-transparent"
              }`}
            >
              ${plan.price.toFixed(2)}
            </span>
            {plan.credits && plan.type !== "free" && (
              <span
                className={`text-sm font-medium ${
                  plan.popular || plan.type === "subscription"
                    ? "text-white/60"
                    : "text-default-400"
                }`}
              >
                / {plan.credits} {t("credits")}
              </span>
            )}
            {plan.interval && plan.type === "subscription" && (
              <span
                className={`text-sm font-medium ${
                  plan.popular || plan.type === "subscription"
                    ? "text-white/60"
                    : "text-default-400"
                }`}
              >
                {plan.interval === "month"
                  ? tSub("plans.pro.perMonth")
                  : tSub("plans.pro.perYear")}
              </span>
            )}
          </p>

          {/* 功能列表 */}
          <ul className="flex flex-col gap-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <Check
                  className={`w-6 h-6 flex-shrink-0 ${
                    plan.popular || plan.type === "subscription"
                      ? "text-white"
                      : "text-primary"
                  }`}
                />
                <p
                  className={`text-sm ${
                    plan.popular || plan.type === "subscription"
                      ? "text-white/80"
                      : "text-default-500"
                  }`}
                >
                  {feature}
                </p>
              </li>
            ))}
          </ul>
        </CardBody>

        <CardFooter className="relative z-10">
          {/* 如果是免费套餐且用户有活跃订阅，则不显示按钮 */}
          {!(plan.type === "free" && hasActiveSubscription) && (
            <Button
              fullWidth
              className={
                plan.type === "subscription"
                  ? "bg-white text-rose-600 dark:text-fuchsia-700 shadow-default-500/50 font-medium shadow-xs hover:bg-white/90"
                  : plan.popular
                    ? "bg-primary-foreground text-primary shadow-default-500/50 font-medium shadow-xs"
                    : ""
              }
              color={plan.buttonColor}
              isDisabled={isCurrentPlan || isSubscribed}
              isLoading={loadingPlanId === plan.id.toString()}
              startContent={
                plan.type === "credits" ? (
                  <CreditCard className="w-5 h-5" />
                ) : plan.type === "subscription" ? (
                  <Calendar className="w-5 h-5" />
                ) : null
              }
              variant={
                isCurrentPlan || isSubscribed
                  ? "flat"
                  : plan.popular || plan.type === "subscription"
                    ? "solid"
                    : "bordered"
              }
              onPress={() => handleSelectPlan(plan)}
            >
              {isSubscribed ? tSub("buttons.currentPlan") : plan.buttonText}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center py-12">
      {/* Page Subtitle */}
      <div className="flex max-w-xl flex-col text-center mb-12">
        <h2 className="text-large text-default-500">{t("subtitle")}</h2>
      </div>

      {/* 套餐卡片网格 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full mb-12">
        {isLoadingPlans ? (
          // 加载占位符
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-3">
                <CardHeader className="flex flex-col items-start gap-2 pb-6">
                  <div className="h-6 w-24 bg-default-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-default-100 rounded animate-pulse" />
                </CardHeader>
                <Divider />
                <CardBody className="gap-4 pt-6">
                  <div className="h-10 w-32 bg-default-200 rounded animate-pulse" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="h-4 w-full bg-default-100 rounded animate-pulse"
                      />
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </>
        ) : (
          plans.map((plan) => renderPlanCard(plan))
        )}
      </div>

      {/* FAQ Section */}
      <div className="w-full">
        <Card className="bg-default-50/50 border-default-200" shadow="sm">
          <CardHeader>
            <h2 className="text-xl font-semibold">{t("faq")}</h2>
          </CardHeader>
          <CardBody className="gap-4">
            <div>
              <h3 className="font-medium mb-2 text-default-700">
                {t("howCreditsWork")}
              </h3>
              <p className="text-sm text-default-500">
                {t("howCreditsWorkAnswer")}
              </p>
            </div>
            <Divider />
            <div>
              <h3 className="font-medium mb-2 text-default-700">
                {t("creditVsSubscription")}
              </h3>
              <p className="text-sm text-default-500">
                {t("creditVsSubscriptionAnswer")}
              </p>
            </div>
            <Divider />
            <div>
              <h3 className="font-medium mb-2 text-default-700">
                {t("cancelAnytime")}
              </h3>
              <p className="text-sm text-default-500">
                {t("cancelAnytimeAnswer")}
              </p>
            </div>
            <Divider />
            <div>
              <h3 className="font-medium mb-2 text-default-700">
                {t("paymentMethods")}
              </h3>
              <p className="text-sm text-default-500">
                {t("paymentMethodsAnswer")}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
