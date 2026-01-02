/**
 * 认证管理器
 * 处理 Google OAuth 和 JWT token 管理
 */

import { AuthState, UserInfo } from "../shared/types";
import {
  STORAGE_KEYS,
  CACHE_TTL,
  API_BASE_URL,
  GOOGLE_CLIENT_ID,
} from "../shared/constants";

export class AuthManager {
  private clientId = GOOGLE_CLIENT_ID;
  private redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;

  /**
   * 使用 Google OAuth 登录
   */
  async loginWithGoogle(): Promise<AuthState> {
    try {
      // 使用 launchWebAuthFlow 获取 Google OAuth token
      const googleToken = await this.getGoogleToken();

      // 与后端交换 JWT token
      const jwt = await this.exchangeTokenWithBackend(googleToken);

      // 解析 JWT 获取用户信息（简单解析，不验证签名）
      const payload = JSON.parse(atob(jwt.split(".")[1]));
      const user: UserInfo = {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };

      // 计算过期时间
      const expiresAt = Date.now() + CACHE_TTL.AUTH;

      // 保存到 Chrome storage
      const authState: AuthState = {
        isAuthenticated: true,
        token: jwt,
        user,
        expiresAt,
      };

      await chrome.storage.local.set({
        [STORAGE_KEYS.AUTH]: authState,
      });

      return authState;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  /**
   * 获取 Google OAuth token
   */
  private async getGoogleToken(): Promise<string> {
    // 构建 OAuth URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    authUrl.searchParams.set("client_id", this.clientId);
    authUrl.searchParams.set("response_type", "id_token");
    authUrl.searchParams.set("redirect_uri", this.redirectUri);
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("nonce", this.generateNonce());

    return new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive: true,
        },
        (redirectUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));

            return;
          }

          if (!redirectUrl) {
            reject(new Error("No redirect URL received"));

            return;
          }

          try {
            // 从重定向 URL 中提取 id_token
            const url = new URL(redirectUrl);
            const hash = url.hash.substring(1); // 移除 #
            const params = new URLSearchParams(hash);
            const idToken = params.get("id_token");

            if (!idToken) {
              reject(new Error("No id_token found in response"));

              return;
            }

            resolve(idToken);
          } catch (error) {
            reject(error);
          }
        },
      );
    });
  }

  /**
   * 生成随机 nonce
   */
  private generateNonce(): string {
    const array = new Uint8Array(16);

    crypto.getRandomValues(array);

    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  /**
   * 与后端交换 token
   */
  private async exchangeTokenWithBackend(googleToken: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/auth/extension-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ googleToken }),
    });

    if (!response.ok) {
      const error = await response.json();

      throw new Error(error.error || "Token exchange failed");
    }

    const data = await response.json();

    return data.token;
  }

  /**
   * 验证 token 是否有效
   */
  async validateToken(token?: string): Promise<boolean> {
    try {
      const tokenToValidate = token || (await this.getToken());

      if (!tokenToValidate) return false;

      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        headers: {
          Authorization: `Bearer ${tokenToValidate}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Token validation failed:", error);

      return false;
    }
  }

  /**
   * 刷新 token（如果需要）
   */
  async refreshToken(): Promise<void> {
    // 对于 Chrome 插件，我们直接重新登录来获取新 token
    await this.logout();
    await this.loginWithGoogle();
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      // 清除 Chrome storage
      await chrome.storage.local.remove([
        STORAGE_KEYS.AUTH,
        STORAGE_KEYS.SELECTED_RESUME_ID,
        STORAGE_KEYS.RESUME_CACHE,
      ]);

      // 吊销 Google token
      const authState = await this.getAuthState();

      if (authState?.token) {
        // 清除 Chrome Identity API 的缓存
        chrome.identity.clearAllCachedAuthTokens(() => {
          console.log("Cleared all cached auth tokens");
        });
      }
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  /**
   * 获取当前认证状态
   */
  async getAuthState(): Promise<AuthState | null> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH);
      const authState = result[STORAGE_KEYS.AUTH] as AuthState | undefined;

      if (!authState) {
        return null;
      }

      // 检查 token 是否过期
      if (authState.expiresAt && Date.now() > authState.expiresAt) {
        await this.logout();

        return null;
      }

      // 验证 token 是否仍然有效
      const isValid = await this.validateToken(authState.token || undefined);

      if (!isValid) {
        await this.logout();

        return null;
      }

      return authState;
    } catch (error) {
      console.error("Failed to get auth state:", error);

      return null;
    }
  }

  /**
   * 获取当前 token
   */
  async getToken(): Promise<string | null> {
    const authState = await this.getAuthState();

    return authState?.token || null;
  }

  /**
   * 获取当前用户
   */
  async getUser(): Promise<UserInfo | null> {
    const authState = await this.getAuthState();

    return authState?.user || null;
  }

  /**
   * 检查是否已认证
   */
  async isAuthenticated(): Promise<boolean> {
    const authState = await this.getAuthState();

    return authState?.isAuthenticated || false;
  }
}

// 导出单例
export const authManager = new AuthManager();
