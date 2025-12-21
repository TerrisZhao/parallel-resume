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
  Star,
} from "lucide-react";

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
  const t = useTranslations("subscriptionPage");
  const tSub = useTranslations("subscription");
  const [userSubscription, setUserSubscription] =
    useState<UserSubscription | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  // Define three plans
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
        className={`relative overflow-visible ${
          plan.popular
            ? "border-2 border-warning scale-105 shadow-lg"
            : "border border-default-200"
        }`}
      >
        {plan.popular && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <Chip
              color="warning"
              startContent={<Star className="w-4 h-4" />}
              variant="shadow"
            >
              {t("mostPopular")}
            </Chip>
          </div>
        )}

        <CardHeader className="flex flex-col items-center gap-2 pt-8 pb-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
            {plan.icon}
          </div>
          <h3 className="text-2xl font-bold">{plan.name}</h3>
          <p className="text-sm text-default-500">{plan.description}</p>
        </CardHeader>

        <CardBody className="gap-4">
          {/* 价格展示 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                ${plan.price.toFixed(2)}
              </span>
              {plan.interval && (
                <span className="text-default-500">/{plan.interval}</span>
              )}
            </div>
            {plan.credits && (
              <Chip color="warning" size="sm" variant="flat">
                {plan.credits} {t("credits")}
              </Chip>
            )}
          </div>

          <Divider />

          {/* 功能列表 */}
          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </CardBody>

        <CardFooter>
          <Button
            className="w-full"
            color={plan.buttonColor}
            isDisabled={isCurrentPlan || isSubscribed}
            isLoading={loadingPlanId === plan.id}
            size="lg"
            startContent={
              plan.type === "credits" ? (
                <CreditCard className="w-5 h-5" />
              ) : plan.type === "subscription" ? (
                <Calendar className="w-5 h-5" />
              ) : null
            }
            variant={isCurrentPlan || isSubscribed ? "flat" : "shadow"}
            onPress={() => handleSelectPlan(plan)}
          >
            {isSubscribed ? tSub("buttons.currentPlan") : plan.buttonText}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Title */}
      <div className="text-center mb-12">
        <h1 className={title({ size: "lg" })}>{t("title")}</h1>
        <p className={subtitle({ class: "mt-4" })}>
          {t("subtitle")}
        </p>
      </div>

      {/* Current Subscription Status Card */}
      {userSubscription && (
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardBody className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-warning/20">
                <Sparkles className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="font-semibold">{t("currentCreditBalance")}</p>
                <p className="text-2xl font-bold text-warning">
                  {userSubscription.credits} {t("credits")}
                </p>
              </div>
            </div>

            {userSubscription.subscriptionStatus === "active" && (
              <div className="text-right">
                <Chip color="success" variant="flat">
                  {t("proSubscribed")}
                </Chip>
                {userSubscription.subscriptionEndDate && (
                  <p className="text-sm text-default-500 mt-2">
                    {t("renewalDate")}{" "}
                    {new Date(
                      userSubscription.subscriptionEndDate,
                    ).toLocaleDateString("en-US")}
                  </p>
                )}
              </div>
            )}

            <Button
              color="primary"
              size="sm"
              variant="flat"
              onPress={() => router.push("/subscription/manage")}
            >
              {t("manageSubscription")}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* 套餐卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 pt-6">
        {plans.map((plan) => renderPlanCard(plan))}
      </div>

      {/* FAQ */}
      <Card className="bg-default-50">
        <CardHeader>
          <h2 className="text-xl font-bold">{t("faq")}</h2>
        </CardHeader>
        <CardBody className="gap-4">
          <div>
            <h3 className="font-semibold mb-2">{t("howCreditsWork")}</h3>
            <p className="text-sm text-default-600">
              {t("howCreditsWorkAnswer")}
            </p>
          </div>
          <Divider />
          <div>
            <h3 className="font-semibold mb-2">
              {t("creditVsSubscription")}
            </h3>
            <p className="text-sm text-default-600">
              {t("creditVsSubscriptionAnswer")}
            </p>
          </div>
          <Divider />
          <div>
            <h3 className="font-semibold mb-2">
              {t("cancelAnytime")}
            </h3>
            <p className="text-sm text-default-600">
              {t("cancelAnytimeAnswer")}
            </p>
          </div>
          <Divider />
          <div>
            <h3 className="font-semibold mb-2">
              {t("paymentMethods")}
            </h3>
            <p className="text-sm text-default-600">
              {t("paymentMethodsAnswer")}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
