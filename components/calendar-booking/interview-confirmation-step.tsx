"use client";

import { useTranslations } from "next-intl";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Video, MapPin, Phone, Calendar, FileText } from "lucide-react";
import { type DateValue } from "@heroui/calendar";

import { type InterviewFormData, type Resume } from "./interview-wizard";
import { type TimeSlot } from "./calendar";

interface InterviewConfirmationStepProps {
  formData: InterviewFormData;
  selectedDate: DateValue | null;
  selectedTime: string;
  selectedTimeSlotRange: TimeSlot[];
  formattedDateTime: string;
  resumes: Resume[];
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export default function InterviewConfirmationStep({
  formData,
  selectedDate,
  selectedTime,
  selectedTimeSlotRange,
  formattedDateTime,
  resumes,
  isSubmitting,
  onBack,
  onConfirm,
}: InterviewConfirmationStepProps) {
  const t = useTranslations("interviews");
  const tCommon = useTranslations("common");

  const getTypeIcon = (type: InterviewFormData["type"]) => {
    switch (type) {
      case "online":
        return <Video size={18} />;
      case "offline":
        return <MapPin size={18} />;
      case "phone":
        return <Phone size={18} />;
      default:
        return <Calendar size={18} />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "applied":
        return "default";
      case "screening":
        return "primary";
      case "technical":
        return "secondary";
      case "onsite":
        return "warning";
      case "offer":
        return "success";
      case "rejected":
        return "danger";
      default:
        return "default";
    }
  };

  const selectedResume = resumes.find((r) => r.id === formData.resumeId);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6">
        {/* Company and Stage */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-default-500 mb-2">{t("company")}</p>
            <p className="text-base font-semibold">{formData.company}</p>
          </div>
          <div>
            <p className="text-sm text-default-500 mb-2">{t("stage")}</p>
            <Chip color={getStageColor(formData.stage)} variant="flat">
              {t(`stages.${formData.stage}`)}
            </Chip>
          </div>
        </div>

        <Divider />

        {/* Interview Type and Location/Link */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-default-500 mb-2">
              {t("interviewType")}
            </p>
            <div className="flex items-center gap-2">
              {getTypeIcon(formData.type)}
              <span>
                {t(
                  `interviewType${formData.type.charAt(0).toUpperCase()}${formData.type.slice(1)}`,
                )}
              </span>
            </div>
          </div>
          {formData.type === "offline" && formData.location && (
            <div>
              <p className="text-sm text-default-500 mb-2">{t("location")}</p>
              <p>{formData.location}</p>
            </div>
          )}
          {formData.type === "online" && formData.videoLink && (
            <div>
              <p className="text-sm text-default-500 mb-2">{t("videoLink")}</p>
              <a
                className="text-primary hover:underline truncate block"
                href={formData.videoLink}
                rel="noopener noreferrer"
                target="_blank"
              >
                {formData.videoLink}
              </a>
            </div>
          )}
        </div>

        <Divider />

        {/* Date and Time */}
        <div>
          <p className="text-sm text-default-500 mb-2">{t("interviewTime")}</p>
          <div className="flex items-center gap-2">
            <Calendar className="text-primary" size={18} />
            <span className="font-medium">{formattedDateTime}</span>
          </div>
          {selectedTimeSlotRange.length > 1 && (
            <p className="text-xs text-default-400 mt-1">
              Duration: {selectedTimeSlotRange[0].label} -{" "}
              {selectedTimeSlotRange[1].label}
            </p>
          )}
        </div>

        <Divider />

        {/* Resume */}
        {selectedResume && (
          <>
            <div>
              <p className="text-sm text-default-500 mb-2">
                {t("relatedResume")}
              </p>
              <div className="flex items-center gap-2">
                <FileText size={18} />
                <span>{selectedResume.name}</span>
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* Notes */}
        {formData.notes && (
          <>
            <div>
              <p className="text-sm text-default-500 mb-2">{t("notes")}</p>
              <p className="text-sm whitespace-pre-wrap">{formData.notes}</p>
            </div>
            <Divider />
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button isDisabled={isSubmitting} variant="flat" onPress={onBack}>
            Back
          </Button>
          <Button color="primary" isLoading={isSubmitting} onPress={onConfirm}>
            {isSubmitting ? "Creating..." : "Create Interview"}
          </Button>
        </div>
      </div>
    </div>
  );
}
