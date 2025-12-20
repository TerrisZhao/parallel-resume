/**
 * API 客户端
 * 与后端 API 通信，处理简历数据获取等操作
 */

import { ResumeData, ResumeBasic } from "../shared/types";
import { API_BASE_URL } from "../shared/constants";
import { authManager } from "./auth-manager";
import { storageManager } from "./storage-manager";

export class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * 发送 API 请求
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await authManager.getToken();

    if (!token) {
      throw new Error("Not authenticated");
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token 过期，尝试刷新
      await authManager.refreshToken();
      // 重试请求
      return this.request<T>(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取用户所有简历列表
   */
  async getResumes(): Promise<ResumeBasic[]> {
    const response = await this.request<{ resumes: any[] }>("/api/resumes");

    // 转换为 ResumeBasic 格式
    return response.resumes.map((resume) => ({
      id: resume.id,
      title: resume.title || "Untitled Resume",
      updatedAt: resume.updatedAt,
    }));
  }

  /**
   * 获取特定简历的完整数据
   */
  async getResume(id: number): Promise<ResumeData> {
    // 先检查缓存
    const cached = await storageManager.getCachedResume(id);
    if (cached) {
      return cached;
    }

    // 从 API 获取
    const response = await this.request<{ resume: any }>(
      `/api/resumes/${id}`
    );

    // 转换为 ResumeData 格式
    const resumeData = this.transformResumeData(response.resume);

    // 缓存结果
    await storageManager.cacheResume(id, resumeData);

    return resumeData;
  }

  /**
   * 转换 API 返回的简历数据为标准格式
   */
  private transformResumeData(apiResume: any): ResumeData {
    // 拆分全名为 firstName 和 lastName
    const nameParts = apiResume.fullName?.split(" ") || [];
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return {
      id: apiResume.id,
      title: apiResume.title,
      fullName: apiResume.fullName || "",
      firstName,
      lastName,
      email: apiResume.email || "",
      phone: apiResume.phone || "",
      location: apiResume.location || "",
      address: apiResume.address || "",
      linkedin: apiResume.linkedin || "",
      github: apiResume.github || "",
      website: apiResume.website || "",
      summary: apiResume.summary || "",
      keySkills: apiResume.keySkills || [],
      workExperiences: (apiResume.workExperiences || []).map((exp: any) => ({
        id: exp.id,
        company: exp.company,
        position: exp.position,
        location: exp.location || "",
        startDate: exp.startDate,
        endDate: exp.endDate,
        isCurrent: exp.isCurrent || false,
        responsibilities: exp.responsibilities || [],
      })),
      education: (apiResume.education || []).map((edu: any) => ({
        id: edu.id,
        school: edu.school,
        degree: edu.degree,
        major: edu.major,
        gpa: edu.gpa || "",
        location: edu.location || "",
        startDate: edu.startDate,
        endDate: edu.endDate,
        isCurrent: edu.isCurrent || false,
      })),
      projects: (apiResume.projects || []).map((proj: any) => ({
        id: proj.id,
        name: proj.name,
        role: proj.role,
        description: proj.description,
        technologies: proj.technologies || [],
        startDate: proj.startDate,
        endDate: proj.endDate,
      })),
      themeColor: apiResume.themeColor || "",
    };
  }

  /**
   * 验证 token 是否有效
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/validate`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  }

  /**
   * 清除缓存并重新获取数据
   */
  async refreshResume(id: number): Promise<ResumeData> {
    await storageManager.clearResumeCache();
    return this.getResume(id);
  }
}

// 导出单例
export const apiClient = new APIClient();
