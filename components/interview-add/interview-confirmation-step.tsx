"use client";

import { useTranslations } from "next-intl";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Card, CardBody } from "@heroui/card";
import { Image } from "@heroui/image";
import {
  Video,
  MapPin,
  Phone,
  Calendar,
  FileText,
  Link as LinkIcon,
  Building2,
  Clock,
  StickyNote,
} from "lucide-react";
import { type DateValue } from "@heroui/calendar";

import { type TimeSlot } from "../calendar-booking/calendar";

import { type InterviewFormData, type Resume } from "./interview-wizard";

interface InterviewConfirmationStepProps {
  formData: InterviewFormData;
  selectedDate: DateValue | null;
  selectedTime: string;
  selectedTimeSlotRange: TimeSlot[];
  formattedDateTime: string;
  resumes: Resume[];
  isSubmitting: boolean;
  isEditing?: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export default function InterviewConfirmationStep({
  formData,
  selectedDate: _selectedDate,
  selectedTime: _selectedTime,
  selectedTimeSlotRange,
  formattedDateTime,
  resumes,
  isSubmitting,
  isEditing = false,
  onBack,
  onConfirm,
}: InterviewConfirmationStepProps) {
  const t = useTranslations("interviews");
  const tCommon = useTranslations("common");

  const getTypeIcon = (type: InterviewFormData["type"]) => {
    switch (type) {
      case "online":
        return <Video className="text-primary" size={16} />;
      case "offline":
        return <MapPin className="text-warning" size={16} />;
      case "phone":
        return <Phone className="text-success" size={16} />;
      default:
        return <Calendar className="text-default-500" size={16} />;
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
        {/* Top Section: Interview Info (Left) + Resume Preview (Right) */}
        <div className="grid grid-cols-2 gap-6 items-stretch">
          {/* Left Side: Interview Information */}
          <div className="space-y-4">
            {/* Company Name */}
            <div className="flex items-start gap-3">
              <Building2 className="text-default-400 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-default-400 mb-1">{t("company")}</p>
                <p className="text-lg font-semibold">{formData.company}</p>
              </div>
            </div>

            {/* Stage */}
            <div className="flex items-center gap-3">
              <div className="w-4.5" />
              <div>
                <p className="text-xs text-default-400 mb-1">{t("stage")}</p>
                <Chip
                  color={getStageColor(formData.stage)}
                  size="sm"
                  variant="flat"
                >
                  {t(`stages.${formData.stage}`)}
                </Chip>
              </div>
            </div>

            {/* Interview Time */}
            <div className="flex items-start gap-3">
              <Clock className="text-default-400 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-default-400 mb-1">
                  {t("interviewTime")}
                </p>
                {formattedDateTime ? (
                  <>
                    <p className="font-medium">{formattedDateTime}</p>
                    {selectedTimeSlotRange.length > 1 && (
                      <p className="text-xs text-default-400 mt-0.5">
                        {t("duration")}: {selectedTimeSlotRange[0].label} -{" "}
                        {selectedTimeSlotRange[1].label}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-default-400">
                    {t("notScheduled")}
                  </p>
                )}
              </div>
            </div>

            {/* Interview Type */}
            <div className="flex items-start gap-3">
              {getTypeIcon(formData.type)}
              <div>
                <p className="text-xs text-default-400 mb-1">
                  {t("interviewType")}
                </p>
                <p className="font-medium">
                  {t(
                    `interviewType${formData.type.charAt(0).toUpperCase()}${formData.type.slice(1)}`,
                  )}
                </p>
              </div>
            </div>

            {/* Location (for offline) */}
            {formData.type === "offline" && formData.location && (
              <div className="flex items-start gap-3">
                <MapPin className="text-default-400 mt-0.5" size={18} />
                <div>
                  <p className="text-xs text-default-400 mb-1">
                    {t("location")}
                  </p>
                  <p className="text-sm">{formData.location}</p>
                </div>
              </div>
            )}

            {/* Video Link (for online) */}
            {formData.type === "online" && formData.videoLink && (
              <div className="flex items-start gap-3">
                <LinkIcon className="text-default-400 mt-0.5" size={18} />
                <div>
                  <p className="text-xs text-default-400 mb-1">
                    {t("videoLink")}
                  </p>
                  <a
                    className="text-sm text-primary hover:underline truncate block max-w-75"
                    href={formData.videoLink}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {formData.videoLink}
                  </a>
                </div>
              </div>
            )}

            {/* Notes */}
            {formData.notes && (
              <div className="flex items-start gap-3">
                <StickyNote className="text-default-400 mt-0.5" size={18} />
                <div>
                  <p className="text-xs text-default-400 mb-1">{t("notes")}</p>
                  <p className="text-sm text-default-600 whitespace-pre-wrap line-clamp-3">
                    {formData.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Resume Preview Thumbnail */}
          <div className="h-full">
            {selectedResume ? (
              <Card
                className="shadow-none border-1 border-default-200 overflow-hidden h-full"
                radius="lg"
                shadow="sm"
              >
                <CardBody className="p-0 h-full flex flex-col">
                  <div className="relative w-full flex-1 overflow-hidden">
                    <Image
                      alt={selectedResume.name}
                      className="object-cover object-top w-full h-full absolute inset-0"
                      classNames={{
                        wrapper: "!max-w-full h-full",
                        img: "w-full h-full object-cover object-top",
                      }}
                      radius="none"
                      src={`/api/resumes/${selectedResume.id}/thumbnail`}
                    />
                  </div>
                  <div className="px-3 py-2 bg-default-50 shrink-0">
                    <div className="flex items-center gap-2">
                      <FileText className="text-default-400" size={14} />
                      <p className="text-xs font-medium truncate">
                        {selectedResume.name}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card className="border-2 border-dashed border-default-200 h-full">
                <CardBody className="flex items-center justify-center">
                  <div className="text-center">
                    <FileText
                      className="text-default-300 mx-auto mb-2"
                      size={32}
                    />
                    <p className="text-xs text-default-400">
                      {t("noResumeSelected")}
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom Section: Cover Letter */}
        {formData.coverLetter ? (
          <div>
            <p className="text-sm font-medium text-default-700 mb-3">
              {t("coverLetter")}
            </p>
            <Card className="bg-default-100 shadow-none border-none">
              <CardBody className="p-4">
                <p className="text-sm whitespace-pre-wrap text-default-600 leading-relaxed">
                  {formData.coverLetter}
                </p>
              </CardBody>
            </Card>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-default-400">{t("noCoverLetter")}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button isDisabled={isSubmitting} variant="flat" onPress={onBack}>
            {tCommon("back")}
          </Button>
          <Button color="primary" isLoading={isSubmitting} onPress={onConfirm}>
            {isSubmitting
              ? isEditing
                ? t("buttons.updating")
                : t("buttons.creating")
              : isEditing
                ? t("buttons.updateInterview")
                : t("buttons.createInterview")}
          </Button>
        </div>
      </div>
    </div>
  );
}
