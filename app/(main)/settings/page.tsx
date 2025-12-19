"use client";

import { useSession } from "next-auth/react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Select, SelectItem } from "@heroui/select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { addToast } from "@heroui/toast";
import {
  X,
  Check,
  Sun,
  Moon,
  Monitor,
  Clock,
  MapPin,
  Smartphone,
  Monitor as MonitorIcon,
  Eye,
  EyeOff,
  RotateCw,
} from "lucide-react";
import { useTheme } from "next-themes";

import { title, subtitle } from "@/components/primitives";

// 登录历史类型定义
interface LoginHistoryItem {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  isSuccessful: boolean;
  failureReason: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);

  // 用户信息编辑状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const nameEditRef = useRef<HTMLDivElement>(null);

  // 主题模式状态
  const [themeMode, setThemeMode] = useState<string>("system");
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);

  // 登录历史状态
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [isLoginHistoryOpen, setIsLoginHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // AI配置状态
  const [aiProvider, setAiProvider] = useState<string>("");
  const [aiModel, setAiModel] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiApiEndpoint, setAiApiEndpoint] = useState("");
  const [customProviderName, setCustomProviderName] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isUpdatingAiConfig, setIsUpdatingAiConfig] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isApiKeyMasked, setIsApiKeyMasked] = useState(false);

  // AI提供商配置
  const AI_PROVIDERS = [
    {
      value: "openai",
      label: "OpenAI",
      defaultEndpoint: "https://api.openai.com/v1",
    },
    {
      value: "deepseek",
      label: "DeepSeek",
      defaultEndpoint: "https://api.deepseek.com/v1",
    },
    {
      value: "claude",
      label: "Anthropic Claude",
      defaultEndpoint: "https://api.anthropic.com/v1",
    },
    {
      value: "gemini",
      label: "Google Gemini",
      defaultEndpoint: "https://generativelanguage.googleapis.com/v1",
    },
    {
      value: "custom",
      label: "自定义模型",
      models: [],
      defaultEndpoint: "",
    },
  ];

  // 显示toast消息
  const showToast = (message: string, type: "success" | "error") => {
    addToast({
      title: message,
      color: type === "success" ? "success" : "danger",
    });
  };

  // 初始化姓名和主题模式（基于 session）
  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
    if (session?.user && (session.user as any)?.themeMode) {
      setThemeMode((session.user as any).themeMode);
    }
  }, [session?.user]);

  // 初始化 AI 配置（基于 /api/user/profile，确保能拿到遮罩后的 API Key）
  useEffect(() => {
    const initAIConfig = async () => {
      if (status !== "authenticated") return;

      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const user = data.user as any;

        if (user?.aiProvider) {
          setAiProvider(user.aiProvider);

          const userModel = user.aiModel || "";
          setAiModel(userModel);
          setAiApiEndpoint(user.aiApiEndpoint || "");
          setCustomProviderName(user.aiCustomProviderName || "");

          // 使用遮罩后的 API Key（如果存在）
          if (user.aiApiKeyMasked) {
            setAiApiKey(user.aiApiKeyMasked);
            setIsApiKeyMasked(true);
          }

          // 初始时至少让当前模型出现在下拉列表中，避免下拉为空
          if (userModel) {
            setAvailableModels([userModel]);
          }
        }
      } catch (error) {
        console.error("初始化AI配置失败:", error);
      }
    };

    void initAIConfig();
  }, [status]);

  // 点击外部区域取消编辑
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditingName &&
        nameEditRef.current &&
        !nameEditRef.current.contains(event.target as Node)
      ) {
        handleCancelEdit();
      }
    };

    if (isEditingName) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingName]);

  // 更新用户姓名
  const handleUpdateName = async () => {
    if (!name.trim()) {
      showToast("姓名不能为空", "error");

      return;
    }

    if (name.trim() === session?.user?.name) {
      setIsEditingName(false);

      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "更新失败");
      }

      // 更新session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: name.trim(),
        },
      });

      showToast("姓名更新成功", "success");
      setIsEditingName(false);
    } catch (error) {
      console.error("更新姓名失败:", error);
      showToast(error instanceof Error ? error.message : "更新失败", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 加载指定提供商的模型列表
  const handleLoadModels = async () => {
    if (!aiProvider || (!aiApiKey && !isApiKeyMasked)) {
      showToast("请先选择AI提供商并填写API Key", "error");

      return;
    }

    setIsLoadingModels(true);
    try {
      const response = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          // 如果当前是遮罩值，则不发送 apiKey，后端会使用已保存的真实 key
          apiKey: !isApiKeyMasked && aiApiKey ? aiApiKey : undefined,
          apiEndpoint: aiApiEndpoint || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "获取模型列表失败");
      }

      const models: string[] = (data.models || []).map(
        (m: { id?: string; name?: string }) => m.id || m.name,
      );

      if (!models.length) {
        showToast("未获取到可用模型，请检查配置是否正确", "error");
      }

      // 确保当前已选模型在列表中
      const merged = new Set(models);

      if (aiModel) {
        merged.add(aiModel);
      }

      const sortedModels = Array.from(merged).sort();

      setAvailableModels(sortedModels);
      showToast("模型列表已更新", "success");
    } catch (error) {
      console.error("获取模型列表失败:", error);
      showToast(
        error instanceof Error ? error.message : "获取模型列表失败",
        "error",
      );
    } finally {
      setIsLoadingModels(false);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setName(session?.user?.name || "");
    setIsEditingName(false);
  };

  // 更新主题模式
  const handleThemeModeChange = async (newThemeMode: string) => {
    setIsUpdatingTheme(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ themeMode: newThemeMode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "更新失败");
      }

      // 更新session
      await update({
        ...session,
        user: {
          ...session?.user,
          themeMode: newThemeMode,
        },
      });

      // 更新next-themes
      setTheme(newThemeMode);
      setThemeMode(newThemeMode);

      showToast("主题设置更新成功", "success");
    } catch (error) {
      console.error("更新主题模式失败:", error);
      showToast(error instanceof Error ? error.message : "更新失败", "error");
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  // 获取登录历史
  const fetchLoginHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/user/login-history");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "获取登录历史失败");
      }

      setLoginHistory(data.history);
    } catch (error) {
      console.error("获取登录历史失败:", error);
      showToast(
        error instanceof Error ? error.message : "获取登录历史失败",
        "error",
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 打开登录历史模态框
  const handleOpenLoginHistory = () => {
    setIsLoginHistoryOpen(true);
    fetchLoginHistory();
  };

  // 保存AI配置
  const handleSaveAiConfig = async () => {
    if (!aiProvider || !aiModel || (!aiApiKey && !isApiKeyMasked)) {
      showToast("请填写完整的AI配置信息", "error");

      return;
    }

    setIsUpdatingAiConfig(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiProvider,
          aiModel,
          // 只有在用户输入了新的明文 key 时才更新后端
          aiApiKey: isApiKeyMasked ? undefined : aiApiKey,
          aiApiEndpoint: aiApiEndpoint || undefined,
          aiCustomProviderName:
            aiProvider === "custom" ? customProviderName : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "保存失败");
      }

      // 更新session
      await update({
        ...session,
        user: {
          ...session?.user,
          aiProvider,
          aiModel,
          aiApiKeyMasked: data.user.aiApiKeyMasked,
          aiApiEndpoint,
          aiCustomProviderName: customProviderName,
        },
      });

      showToast("AI配置保存成功", "success");
      // 更新为遮盖后的Key
      setAiApiKey(data.user.aiApiKeyMasked || "");
      setIsApiKeyMasked(Boolean(data.user.aiApiKeyMasked));
    } catch (error) {
      console.error("保存AI配置失败:", error);
      showToast(error instanceof Error ? error.message : "保存失败", "error");
    } finally {
      setIsUpdatingAiConfig(false);
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    if (!aiProvider || !aiModel) {
      showToast("请填写完整的AI配置信息", "error");

      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          model: aiModel,
          // 如果是遮罩 key，则不发送，后端使用已保存的真实 key
          apiKey: !isApiKeyMasked && aiApiKey ? aiApiKey : undefined,
          apiEndpoint: aiApiEndpoint || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast("连接测试成功", "success");
      } else {
        showToast(`连接测试失败: ${data.error}`, "error");
      }
    } catch (error) {
      console.error("测试连接失败:", error);
      showToast("测试连接失败", "error");
    } finally {
      setIsTestingConnection(false);
    }
  };

  // 清除AI配置
  const handleClearAiConfig = async () => {
    setIsUpdatingAiConfig(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiProvider: null,
          aiModel: null,
          aiApiKey: null,
          aiApiEndpoint: null,
          aiCustomProviderName: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "清除失败");
      }

      // 更新session
      await update({
        ...session,
        user: {
          ...session?.user,
          aiProvider: undefined,
          aiModel: undefined,
          aiApiKeyMasked: undefined,
          aiApiEndpoint: undefined,
          aiCustomProviderName: undefined,
        },
      });

      // 重置状态
      setAiProvider("");
      setAiModel("");
      setAiApiKey("");
      setAiApiEndpoint("");
      setCustomProviderName("");
      setIsApiKeyMasked(false);

      showToast("AI配置已清除", "success");
    } catch (error) {
      console.error("清除AI配置失败:", error);
      showToast(error instanceof Error ? error.message : "清除失败", "error");
    } finally {
      setIsUpdatingAiConfig(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 获取设备图标
  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone size={16} />;
      case "tablet":
        return <MonitorIcon size={16} />;
      default:
        return <Monitor size={16} />;
    }
  };

  // 处理session状态
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  // 显示加载状态
  if (status === "loading") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className={title()}>设置</h1>
          <p className={subtitle({ class: "mt-2" })}>管理您的账户设置和偏好</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-default-500">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 如果未认证，不渲染内容（useEffect会处理跳转）
  if (status === "unauthenticated" || !session) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className={title()}>设置</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">账户信息</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <div ref={nameEditRef} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    classNames={{
                      input: "cursor-pointer",
                    }}
                    isReadOnly={!isEditingName}
                    label="姓名"
                    placeholder="输入您的姓名"
                    value={name}
                    variant={isEditingName ? "bordered" : "flat"}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => !isEditingName && setIsEditingName(true)}
                  />
                </div>
                {isEditingName && (
                  <div className="flex gap-2">
                    <Button
                      isIconOnly
                      className="min-w-10 w-10 h-10 rounded-lg"
                      color="danger"
                      isDisabled={isLoading}
                      variant="light"
                      onPress={handleCancelEdit}
                    >
                      <X size={18} />
                    </Button>
                    <Button
                      isIconOnly
                      className="min-w-10 w-10 h-10 rounded-lg"
                      color="success"
                      isDisabled={!name.trim()}
                      isLoading={isLoading}
                      variant="light"
                      onPress={handleUpdateName}
                    >
                      <Check size={18} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Input
              isReadOnly
              defaultValue={session.user?.email || ""}
              description="邮箱地址不可修改"
              label="邮箱"
              placeholder="输入您的邮箱"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">AI模型配置</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* AI提供商选择 */}
            <Select
              label="AI提供商"
              placeholder="选择AI提供商"
              selectedKeys={aiProvider ? [aiProvider] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                setAiProvider(selected);
                // 重置相关字段
                setAiModel("");
                setAvailableModels([]);
                if (selected !== "custom") {
                  const provider = AI_PROVIDERS.find(
                    (p) => p.value === selected,
                  );

                  setAiApiEndpoint(provider?.defaultEndpoint || "");
                }
              }}
            >
              {AI_PROVIDERS.map((provider) => (
                <SelectItem key={provider.value}>{provider.label}</SelectItem>
              ))}
            </Select>

            {/* 自定义提供商名称 */}
            {aiProvider === "custom" && (
              <Input
                label="提供商名称"
                placeholder="输入自定义提供商名称"
                value={customProviderName}
                onChange={(e) => setCustomProviderName(e.target.value)}
              />
            )}

            {/* 自定义模型名称 */}
            {aiProvider === "custom" && (
              <Input
                label="模型名称"
                placeholder="输入模型名称"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
              />
            )}

            {/* API Key输入 */}
            {aiProvider && (
              <Input
                endContent={
                  <Button
                    isIconOnly
                    className="min-w-8 w-8 h-8"
                    size="sm"
                    variant="light"
                    onPress={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                }
                label="API Key"
                placeholder="输入API Key"
                type={showApiKey ? "text" : "password"}
                value={aiApiKey}
                onChange={(e) => {
                  setAiApiKey(e.target.value);
                  // 一旦用户修改输入，就认为当前值是明文 key
                  setIsApiKeyMasked(false);
                }}
              />
            )}

            {/* API端点 */}
            {aiProvider && (
              <Input
                label="API端点"
                placeholder="输入API端点地址"
                value={aiApiEndpoint}
                onChange={(e) => setAiApiEndpoint(e.target.value)}
              />
            )}

            {/* 模型选择 */}
            {aiProvider && aiProvider !== "custom" && (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    isDisabled={availableModels.length === 0}
                    label="模型"
                    placeholder="选择模型"
                    selectedKeys={aiModel ? [aiModel] : []}
                    onSelectionChange={(keys) =>
                      setAiModel(Array.from(keys)[0] as string)
                    }
                  >
                    {availableModels.map((model) => (
                      <SelectItem key={model}>{model}</SelectItem>
                    ))}
                  </Select>
                </div>
                <Button
                  isIconOnly
                  color="primary"
                  size="lg"
                  className="p-2"
                  isDisabled={
                    isLoadingModels ||
                    !aiProvider ||
                    (!aiApiKey && !isApiKeyMasked)
                  }
                  isLoading={isLoadingModels}
                  variant="flat"
                  onPress={handleLoadModels}
                >
                  <RotateCw />
                </Button>
              </div>
            )}

            {/* 操作按钮 */}
            {aiProvider && (
              <div className="flex gap-2">
                <Button
                  color="primary"
                  isLoading={isTestingConnection}
                  variant="bordered"
                  onPress={handleTestConnection}
                >
                  测试连接
                </Button>
                <Button
                  color="primary"
                  isLoading={isUpdatingAiConfig}
                  onPress={handleSaveAiConfig}
                >
                  保存配置
                </Button>
                {(session?.user as any)?.aiProvider && (
                  <Button
                    color="danger"
                    isLoading={isUpdatingAiConfig}
                    variant="light"
                    onPress={handleClearAiConfig}
                  >
                    清除配置
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">通知设置</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-medium font-medium">邮件通知</p>
                <p className="text-small text-default-500">
                  接收重要更新和通知邮件
                </p>
              </div>
              <Switch
                isSelected={notifications}
                onValueChange={setNotifications}
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-medium font-medium">主题模式</p>
              </div>
              <div style={{ width: "140px" }}>
                <Select
                  classNames={{
                    trigger: "min-h-8 h-8 w-full",
                    value: "text-sm",
                    mainWrapper: "w-full",
                  }}
                  isDisabled={isUpdatingTheme}
                  selectedKeys={[themeMode]}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;

                    if (selectedKey) {
                      handleThemeModeChange(selectedKey);
                    }
                  }}
                >
                  <SelectItem key="light" startContent={<Sun size={16} />}>
                    浅色
                  </SelectItem>
                  <SelectItem key="dark" startContent={<Moon size={16} />}>
                    深色
                  </SelectItem>
                  <SelectItem key="system" startContent={<Monitor size={16} />}>
                    跟随系统
                  </SelectItem>
                </Select>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">安全设置</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Button
              className="w-full justify-start"
              variant="flat"
              onPress={handleOpenLoginHistory}
            >
              登录历史
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">数据管理</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            {/*<Button className="w-full justify-start" variant="flat">*/}
            {/*  导出数据*/}
            {/*</Button>*/}
            <Button
              className="w-full justify-start"
              color="danger"
              variant="flat"
            >
              删除账户
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* 登录历史模态框 */}
      <Modal
        isOpen={isLoginHistoryOpen}
        scrollBehavior="inside"
        size="2xl"
        onOpenChange={setIsLoginHistoryOpen}
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="text-lg font-semibold">登录历史</h3>
          </ModalHeader>
          <ModalBody>
            {isLoadingHistory ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="text-center py-8 text-default-500">
                暂无登录历史记录
              </div>
            ) : (
              <div className="space-y-4">
                {loginHistory.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(item.deviceType)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {item.browser || "Unknown Browser"}
                            </span>
                            <span className="text-sm text-default-500">
                              on {item.os || "Unknown OS"}
                            </span>
                          </div>
                          <div className="text-sm text-default-500 mt-1">
                            {item.deviceType && (
                              <span className="capitalize">
                                {item.deviceType}
                              </span>
                            )}
                            {item.ipAddress && (
                              <span className="ml-2">
                                <MapPin className="inline mr-1" size={12} />
                                {item.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-default-500">
                          <Clock size={12} />
                          {formatDate(item.createdAt)}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            item.isSuccessful ? "text-success" : "text-danger"
                          }`}
                        >
                          {item.isSuccessful ? "登录成功" : "登录失败"}
                        </div>
                      </div>
                    </div>
                    {!item.isSuccessful && item.failureReason && (
                      <div className="mt-2 text-sm text-danger">
                        失败原因: {item.failureReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setIsLoginHistoryOpen(false)}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
