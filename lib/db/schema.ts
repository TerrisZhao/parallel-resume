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
} from "drizzle-orm/pg-core";

// 用户角色枚举
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "user"]);

// 主题模式枚举
export const themeModeEnum = pgEnum("theme_mode", ["light", "dark", "system"]);

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
    preferredLanguage: varchar("preferred_language", { length: 5 }).default("en"), // 首选语言
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
};
