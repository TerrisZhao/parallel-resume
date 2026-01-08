export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Parallel Resume - 简历管理神器",
  description:
    "轻松创建、管理和导出专业简历。现代化设计、多版本管理、一键导出PDF，助你在求职中脱颖而出。",
  navItems: [],
  navMenuItems: [
    {
      label: "简历",
      href: "/resume",
    },
    {
      label: "设置",
      href: "/settings",
    },
  ],
  links: {
    github: "https://github.com/TerrisZhao/parallel-resume",
  },
};
