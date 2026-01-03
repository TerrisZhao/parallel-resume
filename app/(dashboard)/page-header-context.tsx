"use client";

import { createContext, ReactNode } from "react";

export const PageHeaderContext = createContext<{
  setHeader: (header: ReactNode) => void;
  refreshUnreadCount?: () => void;
}>({
  setHeader: () => {},
  refreshUnreadCount: undefined,
});
