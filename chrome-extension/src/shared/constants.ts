/**
 * 常量配置
 */

// API 基础URL
// 注意：在开发时使用 localhost，部署到生产时需要手动修改为生产域名
export const API_BASE_URL = "http://localhost:3100";
// export const API_BASE_URL = "https://your-production-domain.com"; // 生产环境时取消注释

// Google OAuth Client ID (与 Web 应用共用)
export const GOOGLE_CLIENT_ID =
  "852912293818-5lnjv4abpq0ls8gjdml5evb2vfag061p.apps.googleusercontent.com";

// Chrome storage 键名
export const STORAGE_KEYS = {
  AUTH: "auth",
  SELECTED_RESUME_ID: "selectedResumeId",
  RESUME_CACHE: "resumeCache",
  SETTINGS: "settings",
} as const;

// 缓存时间（毫秒）
export const CACHE_TTL = {
  RESUME: 60 * 60 * 1000, // 1 小时
  AUTH: 30 * 24 * 60 * 60 * 1000, // 30 天
} as const;

// 字段检测置信度阈值
export const MINIMUM_CONFIDENCE_THRESHOLD = 40;

// 默认设置
export const DEFAULT_SETTINGS = {
  autoFillEnabled: true,
  confirmBeforeFill: true,
  apiBaseUrl: API_BASE_URL,
};

// 平台域名
export const PLATFORMS = {
  LINKEDIN: "linkedin.com",
  SEEK: "seek.com.au",
  INDEED: "indeed.com",
} as const;

// CSS 类名
export const CSS_CLASSES = {
  FILLED_FIELD: "pr-extension-filled",
  HIGHLIGHTED_FIELD: "pr-extension-highlight",
  ERROR_FIELD: "pr-extension-error",
} as const;
