/**
 * 登录视图组件
 */

import React from "react";

interface LoginViewProps {
  onLogin: () => void;
  loading: boolean;
  error: string | null;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, loading, error }) => {
  return (
    <div className="container">
      <div className="header">
        <div className="logo">
          Parallel <span className="logo-accent">Resume</span>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <h2 style={{ marginBottom: "12px", color: "#333" }}>欢迎使用</h2>
        <p style={{ marginBottom: "30px", color: "#666", fontSize: "14px" }}>
          智能填充求职表单，简化应聘流程
        </p>

        <button className="btn btn-google" disabled={loading} onClick={onLogin}>
          <svg
            height="18"
            viewBox="0 0 18 18"
            width="18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="none" fillRule="evenodd">
              <path
                d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </g>
          </svg>
          <span>{loading ? "登录中..." : "使用 Google 登录"}</span>
        </button>

        <div style={{ marginTop: "30px", fontSize: "12px", color: "#999" }}>
          <p>登录即表示您同意我们的</p>
          <p>服务条款和隐私政策</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
