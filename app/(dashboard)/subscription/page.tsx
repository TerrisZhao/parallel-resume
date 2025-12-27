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
  Star,
  Crown,
} from "lucide-react";

import { usePageHeader } from "../use-page-header";

import { title, subtitle } from "@/components/primitives";

// 套餐类型定义
interface Plan {
  id: string;
  name: string;
  type: "free" | "credits" | "subscription";
  price: number;
  credits?: number;
  interval?: string;
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
  description: string;
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

  // Define three plans (subscription plan disabled)
  const plans: Plan[] = [
    {
      id: "free",
      name: tSub("plans.free.name"),
      type: "free",
      price: 0,
      interval: "",
      features: [
        tSub("plans.free.features.basicEditing"),
        tSub("plans.free.features.templates"),
        tSub("plans.free.features.exportPDF"),
        tSub("plans.free.features.aiOptimizations"),
        tSub("plans.free.features.communitySupport"),
      ],
      icon: <Gift className="w-6 h-6" />,
      description: tSub("plans.free.description"),
      buttonText: tSub("buttons.currentPlan"),
      buttonColor: "default",
    },
    {
      id: "credits-100",
      name: tSub("plans.credits.name"),
      type: "credits",
      price: 9.99,
      credits: 100,
      features: [
        tSub("plans.credits.credits100"),
        tSub("plans.credits.features.neverExpire"),
        tSub("plans.credits.features.flexibleCredits"),
        tSub("plans.credits.features.allFreeFeatures"),
        tSub("plans.credits.features.prioritySupport"),
        tSub("plans.credits.features.payAsYouGo"),
      ],
      popular: true,
      icon: <Zap className="w-6 h-6" />,
      description: tSub("plans.credits.description"),
      buttonText: tSub("buttons.buyNow"),
      buttonColor: "warning",
    },
    {
      id: "pro-monthly",
      name: tSub("plans.pro.name"),
      type: "subscription",
      price: 19.99,
      interval: "month",
      features: [
        tSub("plans.pro.features.unlimitedAI"),
        tSub("plans.pro.features.allFreeFeatures"),
        tSub("plans.pro.features.unlimitedTemplates"),
        tSub("plans.pro.features.prioritySupport"),
        tSub("plans.pro.features.advancedAnalytics"),
      ],
      icon: <Crown className="w-6 h-6" />,
      description: tSub("plans.pro.description"),
      buttonText: tSub("buttons.subscribeNow"),
      buttonColor: "secondary",
    },
  ];

  // Fetch user subscription info
  useEffect(() => {
    if (session) {
      fetchUserSubscription();
    }
  }, [session]);

  // Set page header
  useEffect(() => {
    setHeader(
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <h1 className={title({ size: "sm" })}>{t("title")}</h1>
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

    setLoadingPlanId(plan.id);

    try {
      // Call backend API to create Stripe Checkout session
      const response = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
          planType: plan.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout page
      window.location.href = url;
    } catch (error) {
      console.error("Failed to process plan selection:", error);
      addToast({
        title: t("failedToCreateCheckout"),
        color: "danger",
      });
    } finally {
      setLoadingPlanId(null);
    }
  };

  // Render plan card
  const renderPlanCard = (plan: Plan) => {
    const isCurrentPlan =
      plan.type === "free" && !userSubscription?.subscriptionStatus;
    const isSubscribed =
      plan.type === "subscription" &&
      userSubscription?.subscriptionStatus === "active";

    return (
      <Card
        key={plan.id}
        className={`relative p-3 overflow-visible ${
          plan.popular
            ? "bg-primary shadow-primary/20 shadow-2xl scale-105"
            : plan.type === "subscription"
              ? "shadow-lg backdrop-blur-md"
              : "border-medium border-default-100 bg-transparent"
        }`}
        shadow="none"
        style={
          plan.type === "subscription"
            ? {
                background:
                  "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(168, 85, 247, 0.2) 50%, rgba(236, 72, 153, 0.2) 100%)",
                position: "relative",
              }
            : undefined
        }
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
              plan.popular ? "text-primary-foreground" : ""
            }`}
          >
            {plan.name}
          </h2>
          <p
            className={`text-medium ${
              plan.popular
                ? "text-primary-foreground/70"
                : "text-default-500"
            }`}
          >
            {plan.description}
          </p>
        </CardHeader>

        <Divider className={`${plan.popular ? "bg-primary-foreground/20" : ""} relative z-10`} />

        <CardBody className="gap-8 pt-6 relative z-10">
          {/* 价格展示 */}
          <p className="flex items-baseline gap-1">
            <span
              className={`inline bg-linear-to-br bg-clip-text text-4xl leading-7 font-semibold tracking-tight ${
                plan.popular
                  ? "text-primary-foreground"
                  : "from-foreground to-foreground-600 text-transparent"
              }`}
            >
              ${plan.price.toFixed(2)}
            </span>
            {plan.credits && (
              <span
                className={`text-sm font-medium ${
                  plan.popular
                    ? "text-primary-foreground/50"
                    : "text-default-400"
                }`}
              >
                / {plan.credits} {t("credits")}
              </span>
            )}
            {plan.interval && (
              <span
                className={`text-sm font-medium ${
                  plan.popular
                    ? "text-primary-foreground/50"
                    : "text-default-400"
                }`}
              >
                {plan.interval === "month" ? tSub("plans.pro.perMonth") : tSub("plans.pro.perYear")}
              </span>
            )}
          </p>

          {/* 功能列表 */}
          <ul className="flex flex-col gap-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <Check
                  className={`w-6 h-6 flex-shrink-0 ${
                    plan.popular ? "text-primary-foreground" : "text-primary"
                  }`}
                />
                <p
                  className={`text-sm ${
                    plan.popular
                      ? "text-primary-foreground/70"
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
          <Button
            fullWidth
            className={
              plan.popular
                ? "bg-primary-foreground text-primary shadow-default-500/50 font-medium shadow-xs"
                : ""
            }
            color={plan.buttonColor}
            isDisabled={isCurrentPlan || isSubscribed}
            isLoading={loadingPlanId === plan.id}
            startContent={
              plan.type === "credits" ? (
                <CreditCard className="w-5 h-5" />
              ) : plan.type === "subscription" ? (
                <Calendar className="w-5 h-5" />
              ) : null
            }
            variant={isCurrentPlan || isSubscribed ? "flat" : plan.popular ? "solid" : "bordered"}
            onPress={() => handleSelectPlan(plan)}
          >
            {isSubscribed ? tSub("buttons.currentPlan") : plan.buttonText}
          </Button>
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
        {plans.map((plan) => renderPlanCard(plan))}
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
