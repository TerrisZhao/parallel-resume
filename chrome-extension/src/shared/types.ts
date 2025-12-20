/**
 * 共享类型定义
 */

// 用户信息
export interface UserInfo {
  id: number;
  email: string;
  name: string | null;
  role?: string;
}

// 认证状态
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserInfo | null;
  expiresAt: number | null;
}

// 简历基本信息（列表展示）
export interface ResumeBasic {
  id: number;
  title: string;
  updatedAt: string;
}

// 完整简历数据
export interface ResumeData {
  id: number;
  title: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  location?: string;
  address?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  summary?: string;
  keySkills?: string[];
  workExperiences: WorkExperience[];
  education: Education[];
  projects: Project[];
  themeColor?: string;
}

// 工作经历
export interface WorkExperience {
  id: number;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  responsibilities: string[];
}

// 教育背景
export interface Education {
  id: number;
  school: string;
  degree: string;
  major: string;
  gpa?: string;
  location?: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
}

// 项目经验
export interface Project {
  id: number;
  name: string;
  role: string;
  description: string;
  technologies: string[];
  startDate?: string;
  endDate?: string;
}

// 检测到的字段
export interface DetectedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  resumeField: string;
  confidence: number;
  detectionMethod: string[];
  suggestedValue: string;
}

// 字段填充结果
export interface FieldFillResult {
  field: string;
  success: boolean;
  error?: string;
}

// 填充结果
export interface FillResult {
  results: FieldFillResult[];
  successCount: number;
  totalCount: number;
}

// Chrome storage 数据结构
export interface StorageData {
  auth?: {
    token: string;
    user: UserInfo;
    expiresAt: number;
  };
  selectedResumeId?: number;
  resumeCache?: {
    [id: number]: {
      data: ResumeData;
      cachedAt: number;
    };
  };
  settings?: ExtensionSettings;
}

// 插件设置
export interface ExtensionSettings {
  autoFillEnabled: boolean;
  confirmBeforeFill: boolean;
  apiBaseUrl: string;
}

// 消息类型（用于 background 和 content script 通信）
export type MessageType =
  | "GET_AUTH_STATE"
  | "LOGIN"
  | "LOGOUT"
  | "GET_RESUMES"
  | "GET_RESUME"
  | "SELECT_RESUME"
  | "FILL_FORM"
  | "DETECT_FIELDS";

// 消息结构
export interface Message<T = any> {
  type: MessageType;
  data?: T;
}

// 消息响应
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
