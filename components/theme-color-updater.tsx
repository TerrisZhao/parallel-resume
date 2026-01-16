"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * 动态更新浏览器顶部导航栏的主题颜色
 * 从页面实际背景色读取，确保与页面色系一致
 */
export function ThemeColorUpdater() {
  const { theme, systemTheme } = useTheme();

  useEffect(() => {
    // 等待 DOM 完全加载和主题应用
    const updateThemeColor = () => {
      // 获取 body 的实际背景色
      const bodyBgColor = window.getComputedStyle(document.body).backgroundColor;

      // 获取或创建 theme-color meta 标签
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');

      if (!metaThemeColor) {
        metaThemeColor = document.createElement("meta");
        metaThemeColor.setAttribute("name", "theme-color");
        document.head.appendChild(metaThemeColor);
      }

      // 设置颜色为页面背景色
      metaThemeColor.setAttribute("content", bodyBgColor);
    };

    // 立即更新一次
    updateThemeColor();

    // 延迟更新，确保主题已经完全应用
    const timer = setTimeout(updateThemeColor, 100);

    return () => clearTimeout(timer);
  }, [theme, systemTheme]);

  return null;
}
