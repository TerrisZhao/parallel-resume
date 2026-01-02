"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { useTranslations } from "next-intl";
import { addToast } from "@heroui/toast";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  showSkip?: boolean; // 是否显示"跳过"按钮，默认为 true（首次登录时显示）
}

export function SetPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  showSkip = true,
}: SetPasswordModalProps) {
  const t = useTranslations("setPasswordModal");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    // 验证密码
    if (password.length < 8) {
      addToast({
        title: t("passwordTooShort"),
        color: "danger",
      });
      return;
    }

    if (password !== confirmPassword) {
      addToast({
        title: t("passwordMismatch"),
        color: "danger",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        addToast({
          title: t("success"),
          color: "success",
        });

        // 重置表单
        setPassword("");
        setConfirmPassword("");

        // 调用成功回调
        if (onSuccess) {
          onSuccess();
        }

        // 关闭模态框
        onClose();
      } else {
        addToast({
          title: data.error || t("failed"),
          color: "danger",
        });
      }
    } catch (error) {
      console.error("设置密码失败:", error);
      addToast({
        title: t("failed"),
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      size="md"
      onClose={onClose}
      isDismissable={false}
      hideCloseButton={false}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>{t("title")}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <Input
            autoFocus
            endContent={
              <button
                aria-label="toggle password visibility"
                className="focus:outline-none"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-default-400 pointer-events-none" />
                ) : (
                  <Eye className="w-4 h-4 text-default-400 pointer-events-none" />
                )}
              </button>
            }
            label={t("newPassword")}
            startContent={<Lock className="w-4 h-4 text-default-400" />}
            type={showPassword ? "text" : "password"}
            value={password}
            variant="bordered"
            onValueChange={setPassword}
          />

          <Input
            endContent={
              <button
                aria-label="toggle password visibility"
                className="focus:outline-none"
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4 text-default-400 pointer-events-none" />
                ) : (
                  <Eye className="w-4 h-4 text-default-400 pointer-events-none" />
                )}
              </button>
            }
            label={t("confirmPassword")}
            startContent={<Lock className="w-4 h-4 text-default-400" />}
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            variant="bordered"
            onValueChange={setConfirmPassword}
          />

          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-3">
            <p className="text-xs text-primary-700 dark:text-primary-300">
              {t("passwordRequirements")}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          {showSkip && (
            <Button color="danger" variant="light" onPress={onClose}>
              {t("skip")}
            </Button>
          )}
          <Button
            color="primary"
            isDisabled={!password || !confirmPassword}
            isLoading={isLoading}
            onPress={handleSubmit}
          >
            {t("setPassword")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
