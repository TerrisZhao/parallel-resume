import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";

import { stripe } from "@/lib/payments/stripe";
import { db } from "@/lib/db/drizzle";
import {
  userCredits,
  creditTransactions,
  subscriptions,
  subscriptionPlans,
  payments,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// 处理积分添加
async function addCredits(
  userId: number,
  amount: number,
  description: string,
  relatedId?: number,
) {
  // 获取或创建用户积分记录
  let [userCredit] = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, userId))
    .limit(1);

  if (!userCredit) {
    await db.insert(userCredits).values({
      userId,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
    });
    [userCredit] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);
  }

  const newBalance = userCredit.balance + amount;

  // 更新积分余额
  await db
    .update(userCredits)
    .set({
      balance: newBalance,
      totalEarned: userCredit.totalEarned + amount,
      updatedAt: new Date(),
    })
    .where(eq(userCredits.userId, userId));

  // 创建积分交易记录
  await db.insert(creditTransactions).values({
    userId,
    amount,
    type: "purchase",
    description,
    relatedId,
    relatedType: "payment",
    balanceAfter: newBalance,
  });

  return newBalance;
}

// 处理 checkout.session.completed 事件
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = parseInt(session.metadata?.userId || "0");
  const planId = session.metadata?.planId;
  const planType = session.metadata?.planType;

  if (!userId || !planId || !planType) {
    console.error("Webhook: 缺少必要的元数据", session.metadata);

    return;
  }

  // 记录支付
  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      stripePaymentIntentId: session.payment_intent as string,
      amount: (session.amount_total || 0) / 100, // 从分转换为元
      currency: session.currency || "usd",
      status: "succeeded",
      description: `购买套餐: ${planId}`,
      metadata: {
        sessionId: session.id,
        planId,
        planType,
      },
    })
    .returning({ id: payments.id });

  if (planType === "credits") {
    // 处理积分购买
    const credits = parseInt(session.metadata?.credits || "0");

    if (credits > 0) {
      await addCredits(userId, credits, `购买积分套餐: ${planId}`, payment.id);

      // 更新支付记录中的积分信息
      await db
        .update(payments)
        .set({ creditsGranted: credits })
        .where(eq(payments.id, payment.id));
    }
  } else if (planType === "subscription") {
    // 订阅会在 customer.subscription.created 事件中处理
    console.log("订阅支付完成，等待订阅创建事件");
  }
}

// 处理 customer.subscription.created 事件
async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as any;
  const userId = parseInt(subscription.metadata?.userId || "0");
  const planId = subscription.metadata?.planId;

  if (!userId || !planId) {
    console.error("Webhook: 订阅缺少必要的元数据", subscription.metadata);

    return;
  }

  // 查找套餐
  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.name, planId))
    .limit(1);

  if (!plan) {
    console.error("Webhook: 找不到套餐", planId);

    return;
  }

  // 创建订阅记录
  await db.insert(subscriptions).values({
    userId,
    planId: plan.id,
    stripeSubscriptionId: subscription.id,
    status: subscription.status as any,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialStart: subscription.trial_start
      ? new Date(subscription.trial_start * 1000)
      : null,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
  });

  console.log(`订阅已创建: userId=${userId}, planId=${planId}`);
}

// 处理 customer.subscription.updated 事件
async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as any;
  const stripeSubscriptionId = subscription.id;

  // 查找订阅记录
  const [existingSubscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (!existingSubscription) {
    console.error("Webhook: 找不到订阅记录", stripeSubscriptionId);

    return;
  }

  // 更新订阅状态
  await db
    .update(subscriptions)
    .set({
      status: subscription.status as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, existingSubscription.id));

  console.log(
    `订阅已更新: id=${existingSubscription.id}, status=${subscription.status}`,
  );
}

// 处理 customer.subscription.deleted 事件
async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as any;
  const stripeSubscriptionId = subscription.id;

  // 查找订阅记录
  const [existingSubscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (!existingSubscription) {
    console.error("Webhook: 找不到订阅记录", stripeSubscriptionId);

    return;
  }

  // 更新订阅为已取消
  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, existingSubscription.id));

  console.log(`订阅已取消: id=${existingSubscription.id}`);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "缺少签名" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || "",
    );
  } catch (err: any) {
    console.error("Webhook 签名验证失败:", err.message);

    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  // 处理不同类型的事件
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      default:
        console.log(`未处理的事件类型: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("处理 Webhook 事件失败:", error);

    return NextResponse.json({ error: "处理事件失败" }, { status: 500 });
  }
}
