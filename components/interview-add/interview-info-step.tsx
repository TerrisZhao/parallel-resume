"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";

import { type InterviewFormData, type Resume } from "./interview-wizard";

interface InterviewInfoStepProps {
  resumes: Resume[];
  initialData: InterviewFormData;
  onNext: (data: InterviewFormData) => void;
  onCancel: () => void;
}

const STAGES = [
  "applied",
  "screening",
  "technical",
  "onsite",
  "offer",
  "rejected",
];

export default function InterviewInfoStep({
  resumes,
  initialData,
  onNext,
  onCancel,
}: InterviewInfoStepProps) {
  const t = useTranslations("interviews");
  const tCommon = useTranslations("common");
  const [formData, setFormData] = useState<InterviewFormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证必填字段
    const newErrors: Record<string, string> = {};

    if (!formData.company.trim()) {
      newErrors.company = "Company is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      return;
    }

    onNext(formData);
  };

  return (
    <div className="w-full">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* 第一行：公司名称 + 面试类型 */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            isRequired
            errorMessage={errors.company}
            isInvalid={!!errors.company}
            label={t("company")}
            placeholder={t("companyPlaceholder")}
            value={formData.company}
            onChange={(e) => {
              setFormData({ ...formData, company: e.target.value });
              setErrors({ ...errors, company: "" });
            }}
          />

          <Select
            isRequired
            label={t("interviewType")}
            selectedKeys={[formData.type]}
            onSelectionChange={(keys) =>
              setFormData({
                ...formData,
                type: Array.from(keys)[0] as InterviewFormData["type"],
              })
            }
          >
            <SelectItem key="online">{t("interviewTypeOnline")}</SelectItem>
            <SelectItem key="offline">{t("interviewTypeOffline")}</SelectItem>
            <SelectItem key="phone">{t("interviewTypePhone")}</SelectItem>
            <SelectItem key="other">{t("interviewTypeOther")}</SelectItem>
          </Select>
        </div>

        {formData.type === "offline" && (
          <Input
            label={t("location")}
            placeholder={t("locationPlaceholder")}
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
          />
        )}

        {formData.type === "online" && (
          <Input
            label={t("videoLink")}
            placeholder={t("videoLinkPlaceholder")}
            value={formData.videoLink}
            onChange={(e) =>
              setFormData({ ...formData, videoLink: e.target.value })
            }
          />
        )}

        {/* 第二行：关联简历 + 阶段 */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t("relatedResume")}
            placeholder={t("selectResume")}
            selectedKeys={
              formData.resumeId ? [formData.resumeId.toString()] : []
            }
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;

              setFormData({
                ...formData,
                resumeId: value ? parseInt(value) : undefined,
              });
            }}
          >
            {resumes.map((resume) => (
              <SelectItem key={resume.id.toString()}>{resume.name}</SelectItem>
            ))}
          </Select>

          <Select
            isRequired
            label={t("stage")}
            selectedKeys={[formData.stage]}
            onSelectionChange={(keys) =>
              setFormData({
                ...formData,
                stage: Array.from(keys)[0] as string,
              })
            }
          >
            {STAGES.map((stage) => (
              <SelectItem key={stage}>{t(`stages.${stage}`)}</SelectItem>
            ))}
          </Select>
        </div>

        <Textarea
          label={t("notes")}
          minRows={4}
          placeholder={t("notesPlaceholder")}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="flat" onPress={onCancel}>
            {tCommon("cancel")}
          </Button>
          <Button color="primary" type="submit">
            {t("buttons.nextSelectTime")}
          </Button>
        </div>
      </form>
    </div>
  );
}
