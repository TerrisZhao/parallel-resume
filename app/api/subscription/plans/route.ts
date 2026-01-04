import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { subscriptionPlans } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * 获取用户语言偏好
 */
function getUserLocale(request: NextRequest): "en" | "zh" {
  // 优先从 cookie 获取
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;

  if (cookieLocale === "en" || cookieLocale === "zh") {
    return cookieLocale;
  }

  // 从 Accept-Language header 检测
  const acceptLanguage = request.headers.get("accept-language");

  if (acceptLanguage?.includes("zh")) {
    return "zh";
  }

  // 默认英文
  return "en";
}

/**
 * 获取所有可用的订阅套餐
 * 完全数据库驱动，无需修改代码即可添加/删除套餐
 * 根据用户语言返回对应的多语言内容
 */
export async function GET(request: NextRequest) {
  try {
    const locale = getUserLocale(request);

    // 只查询启用的套餐，按价格由低到高排序
    const plans = await db
      .select({
        id: subscriptionPlans.id,
        nameEn: subscriptionPlans.nameEn,
        nameZh: subscriptionPlans.nameZh,
        type: subscriptionPlans.type,
        price: subscriptionPlans.price,
        credits: subscriptionPlans.credits,
        interval: subscriptionPlans.interval,
        intervalCount: subscriptionPlans.intervalCount,
        featuresEn: subscriptionPlans.featuresEn,
        featuresZh: subscriptionPlans.featuresZh,
        stripePriceId: subscriptionPlans.stripePriceId,
        descriptionEn: subscriptionPlans.descriptionEn,
        descriptionZh: subscriptionPlans.descriptionZh,
        displayOrder: subscriptionPlans.displayOrder,
        isPopular: subscriptionPlans.isPopular,
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.price);

    // 转换价格为数字类型，并根据语言选择对应内容
    const formattedPlans = plans.map((plan: (typeof plans)[number]) => {
      // 选择对应语言的内容
      const name = locale === "zh" ? plan.nameZh : plan.nameEn;
      const description =
        (locale === "zh" ? plan.descriptionZh : plan.descriptionEn) || "";
      const features =
        (locale === "zh" ? plan.featuresZh : plan.featuresEn) || [];

      return {
        id: plan.id,
        name,
        type: plan.type,
        price: parseFloat(plan.price),
        credits: plan.credits,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        features,
        stripePriceId: plan.stripePriceId,
        description,
        displayOrder: plan.displayOrder,
        isPopular: plan.isPopular,
      };
    });

    return NextResponse.json({ plans: formattedPlans });
  } catch (error) {
    console.error("获取订阅套餐失败:", error);

    return NextResponse.json({ error: "获取订阅套餐失败" }, { status: 500 });
  }
}
