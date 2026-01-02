"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到用户管理页面
    router.push("/admin/users");
  }, [router]);

  return null;
}
