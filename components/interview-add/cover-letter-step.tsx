"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";

export interface CoverLetterData {
  jobDescription: string;
  coverLetter: string;
}

interface CoverLetterStepProps {
  company: string;
  resumeId?: number;
  initialData: CoverLetterData;
  onNext: (data: CoverLetterData) => void;
  onBack: () => void;
  onSkip: () => void;
}

interface AIAvailability {
  available: boolean;
  mode?: "credits" | "subscription" | "custom";
  balance?: number;
}

export default function CoverLetterStep({
  company,
  resumeId,
  initialData,
  onNext,
  onBack,
  onSkip,
}: CoverLetterStepProps) {
  const t = useTranslations("interviews");
  const tCommon = useTranslations("common");
  const [jobDescription, setJobDescription] = useState(
    initialData.jobDescription,
  );
  const [coverLetter, setCoverLetter] = useState(initialData.coverLetter);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingAI, setIsCheckingAI] = useState(true);
  const [aiAvailability, setAIAvailability] = useState<AIAvailability>({
    available: false,
  });

  // 检查 AI 可用性
  useEffect(() => {
    const checkAIAvailability = async () => {
      try {
        const response = await fetch("/api/ai/available-modes");

        if (response.ok) {
          const data = await response.json();
          const modes = data.modes;

          // 检查是否有任何可用的 AI 模式
          if (modes.credits?.available) {
            setAIAvailability({
              available: true,
              mode: "credits",
              balance: modes.credits.balance,
            });
          } else if (modes.subscription?.available) {
            setAIAvailability({
              available: true,
              mode: "subscription",
            });
          } else if (modes.custom?.available) {
            // 自定义模式需要用户配置了 API key
            const configResponse = await fetch("/api/user/ai-config");

            if (configResponse.ok) {
              const configData = await configResponse.json();

              if (configData.aiConfigMode === "custom" && configData.aiApiKey) {
                setAIAvailability({
                  available: true,
                  mode: "custom",
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to check AI availability:", error);
      } finally {
        setIsCheckingAI(false);
      }
    };

    checkAIAvailability();
  }, []);

  const handleGenerate = async () => {
    if (!resumeId) {
      addToast({
        title: t("selectResumeFirst"),
        color: "warning",
      });

      return;
    }

    if (!jobDescription.trim()) {
      addToast({
        title: t("jobDescriptionRequired"),
        color: "warning",
      });

      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          company,
          jobDescription,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCoverLetter(data.coverLetter);
        addToast({
          title: t("coverLetterGenerated"),
          color: "success",
        });

        // 如果是积分模式，显示消耗的积分
        if (data.mode === "credits" && data.creditsConsumed) {
          addToast({
            title: `${t("creditsConsumed")}: ${data.creditsConsumed}`,
            color: "default",
          });
        }
      } else {
        addToast({
          title: data.error || t("generateFailed"),
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Failed to generate cover letter:", error);
      addToast({
        title: t("generateFailed"),
        color: "danger",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({
      jobDescription,
      coverLetter,
    });
  };

  const canGenerate = aiAvailability.available && resumeId && !isGenerating;

  return (
    <div className="w-full">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* AI 生成区域 */}
        {isCheckingAI ? (
          <div className="flex items-center justify-center py-4">
            <Spinner size="sm" />
            <span className="ml-2 text-default-500">{t("checkingAI")}</span>
          </div>
        ) : aiAvailability.available ? (
          <div className="flex flex-col gap-4 p-4 bg-default-100 rounded-lg">
            <div className="flex items-center gap-2">
              <Icon
                className="text-primary"
                icon="solar:magic-stick-3-bold-duotone"
                width={20}
              />
              <span className="font-medium">{t("aiGenerateSection")}</span>
              {aiAvailability.mode === "credits" &&
                aiAvailability.balance !== undefined && (
                  <span className="text-small text-default-500">
                    ({t("creditsBalance")}: {aiAvailability.balance})
                  </span>
                )}
            </div>

            <Textarea
              description={t("jobDescriptionHint")}
              label={t("jobDescription")}
              minRows={4}
              placeholder={t("jobDescriptionPlaceholder")}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />

            {!resumeId && (
              <p className="text-small text-warning">
                <Icon
                  className="inline mr-1"
                  icon="solar:danger-triangle-bold"
                  width={16}
                />
                {t("selectResumeFirst")}
              </p>
            )}

            <Button
              className="self-start"
              color="primary"
              isDisabled={!canGenerate}
              isLoading={isGenerating}
              startContent={
                !isGenerating && (
                  <Icon icon="solar:magic-stick-3-bold-duotone" width={18} />
                )
              }
              variant="flat"
              onPress={handleGenerate}
            >
              {isGenerating ? t("generating") : t("generateWithAI")}
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-default-100 rounded-lg">
            <p className="text-default-500">
              <Icon
                className="inline mr-1"
                icon="solar:info-circle-bold"
                width={16}
              />
              {t("aiNotAvailable")}
            </p>
          </div>
        )}

        {/* Cover Letter 内容区域 */}
        <Textarea
          description={t("coverLetterHint")}
          label={t("coverLetter")}
          minRows={10}
          placeholder={t("coverLetterPlaceholder")}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
        />

        {/* 按钮区域 */}
        <div className="flex justify-between mt-4">
          <Button variant="flat" onPress={onBack}>
            {tCommon("back")}
          </Button>

          <div className="flex gap-2">
            <Button variant="light" onPress={onSkip}>
              {t("skipCoverLetter")}
            </Button>
            <Button color="primary" type="submit">
              {t("buttons.nextConfirm")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
