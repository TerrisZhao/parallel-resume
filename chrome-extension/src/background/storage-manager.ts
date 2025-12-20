/**
 * Storage 管理器
 * 封装 Chrome storage API，提供缓存和数据管理功能
 */

import {
  ResumeData,
  ResumeBasic,
  ExtensionSettings,
  StorageData,
} from "../shared/types";
import {
  STORAGE_KEYS,
  CACHE_TTL,
  DEFAULT_SETTINGS,
} from "../shared/constants";

export class StorageManager {
  /**
   * 缓存简历数据
   */
  async cacheResume(id: number, data: ResumeData): Promise<void> {
    const cache = await this.getResumeCache();
    cache[id] = {
      data,
      cachedAt: Date.now(),
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.RESUME_CACHE]: cache });
  }

  /**
   * 获取缓存的简历数据
   */
  async getCachedResume(id: number): Promise<ResumeData | null> {
    const cache = await this.getResumeCache();
    const cached = cache[id];

    if (!cached) return null;

    const age = Date.now() - cached.cachedAt;

    if (age > CACHE_TTL.RESUME) {
      // 缓存过期，删除
      delete cache[id];
      await chrome.storage.local.set({ [STORAGE_KEYS.RESUME_CACHE]: cache });
      return null;
    }

    return cached.data;
  }

  /**
   * 获取所有缓存的简历
   */
  private async getResumeCache(): Promise<
    StorageData["resumeCache"] extends infer T ? NonNullable<T> : never
  > {
    const result = await chrome.storage.local.get(STORAGE_KEYS.RESUME_CACHE);
    return (result[STORAGE_KEYS.RESUME_CACHE] as any) || {};
  }

  /**
   * 清除简历缓存
   */
  async clearResumeCache(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.RESUME_CACHE);
  }

  /**
   * 设置选中的简历 ID
   */
  async setSelectedResumeId(id: number): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_RESUME_ID]: id });
  }

  /**
   * 获取选中的简历 ID
   */
  async getSelectedResumeId(): Promise<number | null> {
    const result = await chrome.storage.local.get(
      STORAGE_KEYS.SELECTED_RESUME_ID
    );
    return result[STORAGE_KEYS.SELECTED_RESUME_ID] || null;
  }

  /**
   * 获取设置
   */
  async getSettings(): Promise<ExtensionSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  }

  /**
   * 保存设置
   */
  async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...settings };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: newSettings });
  }

  /**
   * 清除所有数据（用于登出）
   */
  async clearAll(): Promise<void> {
    await chrome.storage.local.clear();
  }

  /**
   * 获取存储使用情况
   */
  async getStorageInfo(): Promise<{
    bytesInUse: number;
    quota: number;
  }> {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
        resolve({
          bytesInUse,
          quota: chrome.storage.local.QUOTA_BYTES,
        });
      });
    });
  }
}

// 导出单例
export const storageManager = new StorageManager();
