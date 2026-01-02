/**
 * Background Service Worker
 * 处理插件的后台逻辑、消息传递和 API 调用
 */

import { Message, MessageResponse } from "../shared/types";

import { authManager } from "./auth-manager";
import { apiClient } from "./api-client";
import { storageManager } from "./storage-manager";

// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log("Parallel Resume Extension installed");
});

// 监听来自 popup 和 content script 的消息
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    handleMessage(message, sender)
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error("Message handling error:", error);
        sendResponse({
          success: false,
          error: error.message || "Unknown error",
        });
      });

    // 返回 true 表示异步发送响应
    return true;
  },
);

/**
 * 处理各种消息类型
 */
async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
): Promise<any> {
  switch (message.type) {
    case "GET_AUTH_STATE":
      return await authManager.getAuthState();

    case "LOGIN":
      return await authManager.loginWithGoogle();

    case "LOGOUT":
      await authManager.logout();

      return { success: true };

    case "GET_RESUMES":
      return await apiClient.getResumes();

    case "GET_RESUME":
      if (!message.data?.id) {
        throw new Error("Resume ID is required");
      }

      return await apiClient.getResume(message.data.id);

    case "SELECT_RESUME":
      if (!message.data?.id) {
        throw new Error("Resume ID is required");
      }
      await storageManager.setSelectedResumeId(message.data.id);

      return { success: true };

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

/**
 * 监听 storage 变化
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    console.log("Storage changed:", changes);
  }
});

// 定期检查 token 有效性（每小时）
setInterval(
  async () => {
    const isAuth = await authManager.isAuthenticated();

    if (isAuth) {
      const isValid = await authManager.validateToken();

      if (!isValid) {
        console.log("Token expired, logging out");
        await authManager.logout();
      }
    }
  },
  60 * 60 * 1000,
); // 1 hour
