import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  primaryKey,
  json,
  decimal,
} from "drizzle-orm/pg-core";

// 用户角色枚举
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "user"]);

// 主题模式枚举
export const themeModeEnum = pgEnum("theme_mode", ["light", "dark", "system"]);

// 语言偏好枚举
export const languagePreferenceEnum = pgEnum("language_preference", [
  "system",
  "en",
  "zh",
]);

// AI提供商枚举
export const aiProviderEnum = pgEnum("ai_provider", [
  "openai",
  "deepseek",
  "claude",
  "gemini",
  "custom",
]);

// 订阅套餐类型枚举
export const planTypeEnum = pgEnum("plan_type", [
  "free",
  "credits",
  "subscription",
]);

// 订阅状态枚举
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete",
  "incomplete_expired",
  "unpaid",
]);

// 积分交易类型枚举
export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "purchase",
  "usage",
  "refund",
  "bonus",
  "subscription_grant",
]);

// 支付状态枚举
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "canceled",
  "refunded",
]);

// 用户表
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: text("password_hash"),
  provider: varchar("provider", { length: 50 }), // 'google', 'github', 'credentials'
  providerId: varchar("provider_id", { length: 255 }),
  role: userRoleEnum("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  themeMode: themeModeEnum("theme_mode").notNull().default("system"),
  preferredLanguage: languagePreferenceEnum("preferred_language")
    .notNull()
    .default("system"),
  // AI配置字段
  aiProvider: aiProviderEnum("ai_provider"), // AI提供商
  aiModel: varchar("ai_model", { length: 100 }), // 模型名称
  aiApiKey: text("ai_api_key"), // 加密后的API Key
  aiApiEndpoint: varchar("ai_api_endpoint", { length: 500 }), // API端点
  aiCustomProviderName: varchar("ai_custom_provider_name", { length: 100 }), // 自定义提供商名称
  aiConfigUpdatedAt: timestamp("ai_config_updated_at"), // AI配置更新时间
  // Stripe相关
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }), // Stripe客户ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"), // 软删除
});

// 账户表 (NextAuth.js 需要)
export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    type: varchar("type", { length: 50 }).notNull(), // 'oauth', 'email', 'credentials'
    provider: varchar("provider", { length: 50 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: timestamp("expires_at"),
    tokenType: varchar("token_type", { length: 50 }),
    scope: varchar("scope", { length: 255 }),
    idToken: text("id_token"),
    sessionState: varchar("session_state", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("accounts_user_id_idx").on(table.userId),
  }),
);

// 会话表 (NextAuth.js 需要)
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
    userId: integer("user_id").notNull(),
    expires: timestamp("expires").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
  }),
);

// 验证令牌表 (NextAuth.js 需要)
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

// 登录历史表
export const loginHistory = pgTable(
  "login_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }), // IPv4 或 IPv6 地址
    userAgent: text("user_agent"), // 用户代理字符串
    deviceType: varchar("device_type", { length: 50 }), // 设备类型：desktop, mobile, tablet
    browser: varchar("browser", { length: 100 }), // 浏览器名称
    os: varchar("os", { length: 100 }), // 操作系统
    location: varchar("location", { length: 255 }), // 地理位置（可选）
    isSuccessful: boolean("is_successful").notNull().default(true), // 是否登录成功
    failureReason: varchar("failure_reason", { length: 255 }), // 失败原因（如果登录失败）
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("login_history_user_id_idx").on(table.userId),
    createdAtIdx: index("login_history_created_at_idx").on(table.createdAt),
  }),
);

// 简历表
export const resumes = pgTable(
  "resumes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(), // 简历名称
    fullName: varchar("full_name", { length: 255 }),
    preferredName: varchar("preferred_name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    location: varchar("location", { length: 255 }),
    linkedin: varchar("linkedin", { length: 255 }),
    github: varchar("github", { length: 255 }),
    website: varchar("website", { length: 255 }),
    summary: text("summary"),
    keySkills: json("key_skills").$type<string[]>().default([]), // JSON array
    additionalInfo: text("additional_info"),
    themeColor: varchar("theme_color", { length: 20 }).default("#000000"), // 主题颜色
    preferredLanguage: varchar("preferred_language", { length: 5 }).default(
      "en",
    ), // 首选语言
    aiOptimizationEnabled: boolean("ai_optimization_enabled")
      .notNull()
      .default(false), // AI优化总开关
    jobDescription: text("job_description"), // 职位描述（AI优化时使用）
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("resumes_user_id_idx").on(table.userId),
    userIdCreatedAtIdx: index("resumes_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

// 工作经历表
export const resumeWorkExperiences = pgTable(
  "resume_work_experiences",
  {
    id: serial("id").primaryKey(),
    resumeId: integer("resume_id").notNull(),
    company: varchar("company", { length: 255 }),
    position: varchar("position", { length: 255 }),
    startDate: varchar("start_date", { length: 50 }),
    endDate: varchar("end_date", { length: 50 }),
    current: boolean("current").notNull().default(false),
    description: text("description"), // 公司或项目的总体描述
    responsibilities: json("responsibilities").$type<string[]>().default([]),
    order: integer("order").notNull().default(0), // 显示顺序
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    resumeIdIdx: index("resume_work_experiences_resume_id_idx").on(
      table.resumeId,
    ),
    resumeIdOrderIdx: index("resume_work_experiences_resume_id_order_idx").on(
      table.resumeId,
      table.order,
    ),
  }),
);

// 教育背景表
export const resumeEducation = pgTable(
  "resume_education",
  {
    id: serial("id").primaryKey(),
    resumeId: integer("resume_id").notNull(),
    school: varchar("school", { length: 255 }),
    degree: varchar("degree", { length: 255 }),
    major: varchar("major", { length: 255 }),
    startDate: varchar("start_date", { length: 50 }),
    endDate: varchar("end_date", { length: 50 }),
    current: boolean("current").notNull().default(false),
    gpa: varchar("gpa", { length: 50 }),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    resumeIdIdx: index("resume_education_resume_id_idx").on(table.resumeId),
    resumeIdOrderIdx: index("resume_education_resume_id_order_idx").on(
      table.resumeId,
      table.order,
    ),
  }),
);

// 项目经历表
export const resumeProjects = pgTable(
  "resume_projects",
  {
    id: serial("id").primaryKey(),
    resumeId: integer("resume_id").notNull(),
    name: varchar("name", { length: 255 }),
    role: varchar("role", { length: 255 }),
    startDate: varchar("start_date", { length: 50 }),
    endDate: varchar("end_date", { length: 50 }),
    current: boolean("current").notNull().default(false),
    description: text("description"),
    technologies: json("technologies").$type<string[]>().default([]),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    resumeIdIdx: index("resume_projects_resume_id_idx").on(table.resumeId),
    resumeIdOrderIdx: index("resume_projects_resume_id_order_idx").on(
      table.resumeId,
      table.order,
    ),
  }),
);

// ==================== 订阅和支付相关表 ====================

// 订阅套餐表
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 套餐名称：Free, Starter, Pro等
  type: planTypeEnum("type").notNull(), // 套餐类型
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"), // 价格
  credits: integer("credits"), // 充值套餐给予的积分数量
  interval: varchar("interval", { length: 20 }), // month, year, one_time
  intervalCount: integer("interval_count").default(1), // 间隔数量
  features: json("features").$type<string[]>().default([]), // 功能列表
  stripePriceId: varchar("stripe_price_id", { length: 255 }), // Stripe价格ID
  isActive: boolean("is_active").notNull().default(true), // 是否可用
  displayOrder: integer("display_order").notNull().default(0), // 显示顺序
  description: text("description"), // 套餐描述
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 用户订阅表
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    planId: integer("plan_id").notNull(),
    stripeSubscriptionId: varchar("stripe_subscription_id", {
      length: 255,
    }).unique(), // Stripe订阅ID
    status: subscriptionStatusEnum("status").notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start"), // 当前周期开始
    currentPeriodEnd: timestamp("current_period_end"), // 当前周期结束
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false), // 是否周期结束后取消
    canceledAt: timestamp("canceled_at"), // 取消时间
    trialStart: timestamp("trial_start"), // 试用开始
    trialEnd: timestamp("trial_end"), // 试用结束
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
    stripeSubscriptionIdIdx: index(
      "subscriptions_stripe_subscription_id_idx",
    ).on(table.stripeSubscriptionId),
  }),
);

// 用户积分表
export const userCredits = pgTable(
  "user_credits",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().unique(),
    balance: integer("balance").notNull().default(0), // 当前积分余额
    totalEarned: integer("total_earned").notNull().default(0), // 总获得积分
    totalSpent: integer("total_spent").notNull().default(0), // 总消费积分
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_credits_user_id_idx").on(table.userId),
  }),
);

// 积分交易记录表
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    amount: integer("amount").notNull(), // 积分数量（正数为获得，负数为消费）
    type: creditTransactionTypeEnum("type").notNull(),
    description: text("description"), // 交易描述
    relatedId: integer("related_id"), // 关联的ID（如订单ID、简历ID等）
    relatedType: varchar("related_type", { length: 50 }), // 关联类型：payment, resume, etc
    balanceAfter: integer("balance_after").notNull(), // 交易后的余额
    metadata: json("metadata"), // 额外的元数据
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("credit_transactions_user_id_idx").on(table.userId),
    typeIdx: index("credit_transactions_type_idx").on(table.type),
    createdAtIdx: index("credit_transactions_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

// 支付记录表
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    planId: integer("plan_id"), // 关联的套餐ID
    stripePaymentIntentId: varchar("stripe_payment_intent_id", {
      length: 255,
    }), // Stripe支付意图ID
    stripeChargeId: varchar("stripe_charge_id", { length: 255 }), // Stripe收费ID
    stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }), // Stripe发票ID
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // 金额
    currency: varchar("currency", { length: 3 }).notNull().default("usd"), // 货币
    status: paymentStatusEnum("status").notNull().default("pending"),
    creditsGranted: integer("credits_granted"), // 授予的积分数量
    description: text("description"),
    metadata: json("metadata"), // 额外的元数据
    failureReason: text("failure_reason"), // 失败原因
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("payments_user_id_idx").on(table.userId),
    statusIdx: index("payments_status_idx").on(table.status),
    stripePaymentIntentIdIdx: index("payments_stripe_payment_intent_id_idx").on(
      table.stripePaymentIntentId,
    ),
    createdAtIdx: index("payments_created_at_idx").on(table.createdAt),
  }),
);

// 导出所有表
export const schema = {
  users,
  accounts,
  sessions,
  verificationTokens,
  loginHistory,
  resumes,
  resumeWorkExperiences,
  resumeEducation,
  resumeProjects,
  subscriptionPlans,
  subscriptions,
  userCredits,
  creditTransactions,
  payments,
};
