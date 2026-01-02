#!/usr/bin/env tsx
/**
 * 数据库重置脚本
 * 警告：此脚本会删除所有数据！
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function resetDatabase() {
  const { default: postgres } = await import("postgres");

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL 环境变量未设置！");
    process.exit(1);
  }

  console.log("\n⚠️  警告：此操作将删除数据库中的所有数据！");
  console.log("📍 数据库：", connectionString.split("@")[1]);
  console.log("\n继续执行将在 3 秒后开始...\n");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    const sql = postgres(connectionString, { prepare: false });

    console.log("🗑️  删除所有表和类型...");

    // 删除 public schema 并重新创建
    await sql.unsafe(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);

    // 删除 drizzle schema
    await sql.unsafe(`DROP SCHEMA IF EXISTS drizzle CASCADE;`);

    await sql.end();

    console.log("✅ 数据库已重置！");
    console.log("\n下一步：运行 pnpm init 重新初始化数据库\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ 重置数据库失败：", error);
    process.exit(1);
  }
}

resetDatabase();
