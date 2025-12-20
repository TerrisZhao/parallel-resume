/**
 * Popup UI - 插件弹窗主组件
 */

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AuthState, ResumeBasic, Message, MessageResponse } from "../shared/types";
import LoginView from "./components/LoginView";
import ResumeSelector from "./components/ResumeSelector";

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [resumes, setResumes] = useState<ResumeBasic[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 发送消息到 background script
  const sendMessage = <T,>(message: Message): Promise<T> => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
        if (response.success) {
          resolve(response.data as T);
        } else {
          reject(new Error(response.error || "Unknown error"));
        }
      });
    });
  };

  // 初始化：检查认证状态
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const state = await sendMessage<AuthState>({ type: "GET_AUTH_STATE" });
        setAuthState(state);

        if (state?.isAuthenticated) {
          // 加载简历列表
          await loadResumes();
        }
      } catch (err: any) {
        console.error("Init error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // 加载简历列表
  const loadResumes = async () => {
    try {
      const resumeList = await sendMessage<ResumeBasic[]>({
        type: "GET_RESUMES",
      });
      setResumes(resumeList);

      // 获取已选中的简历 ID
      const result = await chrome.storage.local.get("selectedResumeId");
      const selected = result.selectedResumeId;
      if (selected) {
        setSelectedResumeId(selected);
      } else if (resumeList.length > 0) {
        // 默认选中第一个简历
        setSelectedResumeId(resumeList[0].id);
        await sendMessage({ type: "SELECT_RESUME", data: { id: resumeList[0].id } });
      }
    } catch (err: any) {
      console.error("Load resumes error:", err);
      setError(err.message);
    }
  };

  // 处理登录
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const state = await sendMessage<AuthState>({ type: "LOGIN" });
      setAuthState(state);

      if (state?.isAuthenticated) {
        await loadResumes();
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 处理登出
  const handleLogout = async () => {
    try {
      setLoading(true);
      await sendMessage({ type: "LOGOUT" });
      setAuthState(null);
      setResumes([]);
      setSelectedResumeId(null);
    } catch (err: any) {
      console.error("Logout error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理简历选择
  const handleResumeSelect = async (id: number) => {
    try {
      setSelectedResumeId(id);
      await sendMessage({ type: "SELECT_RESUME", data: { id } });
    } catch (err: any) {
      console.error("Select resume error:", err);
      setError(err.message);
    }
  };

  // 加载中状态
  if (loading && !authState) {
    return (
      <div className="container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  // 未登录状态
  if (!authState?.isAuthenticated) {
    return <LoginView onLogin={handleLogin} loading={loading} error={error} />;
  }

  // 已登录状态
  return (
    <div className="container">
      <div className="header">
        <div className="logo">
          Parallel <span className="logo-accent">Resume</span>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {authState.user && (
        <div className="user-info">
          <div>
            <div className="user-name">{authState.user.name || "用户"}</div>
            <div className="user-email">{authState.user.email}</div>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}>
            登出
          </button>
        </div>
      )}

      <ResumeSelector
        resumes={resumes}
        selectedId={selectedResumeId}
        onSelect={handleResumeSelect}
      />

      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={() => {
            // 通知 content script 开始填充
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "FILL_FORM" });
              }
            });
          }}
          disabled={!selectedResumeId}
        >
          自动填充
        </button>
      </div>
    </div>
  );
};

// 渲染应用
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
