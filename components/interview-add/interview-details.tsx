"use client";

import { Icon } from "@iconify/react";
import { cn } from "@heroui/theme";
import { Tab, Tabs } from "@heroui/tabs";
import { type DateValue } from "@heroui/calendar";
import { useMemo } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";

import {
  DurationEnum,
  durations,
  type TimeSlot,
} from "../calendar-booking/calendar";

import { type InterviewFormData } from "./interview-wizard";

interface InterviewDetailsProps {
  className?: string;
  formData: InterviewFormData;
  selectedDuration: DurationEnum;
  onDurationChange?: (selectedKey: React.Key) => void;
  selectedTimeSlotRange?: TimeSlot[];
  selectedDate?: DateValue;
}

export default function InterviewDetails({
  className,
  formData,
  selectedDuration,
  onDurationChange,
  selectedTimeSlotRange,
  selectedDate,
}: InterviewDetailsProps) {
  const t = useTranslations("interviews");
  const locale = useLocale();

  const bookingDate = useMemo(() => {
    if (selectedDate) {
      const date = new Date(selectedDate.toString());

      if (locale === "zh") {
        return format(date, "yyyy年M月d日 EEEE", { locale: zhCN });
      }

      return format(date, "EEEE, MMMM d, yyyy");
    }

    return "";
  }, [selectedDate, locale]);

  const getInterviewTypeLabel = () => {
    switch (formData.type) {
      case "online":
        return t("interviewTypeOnline");
      case "offline":
        return t("interviewTypeOffline");
      case "phone":
        return t("interviewTypePhone");
      case "other":
        return t("interviewTypeOther");
      default:
        return formData.type;
    }
  };

  const getInterviewTypeIcon = () => {
    switch (formData.type) {
      case "online":
        return "solar:videocamera-bold";
      case "offline":
        return "solar:map-point-bold";
      case "phone":
        return "solar:phone-bold";
      case "other":
        return "solar:document-text-bold";
      default:
        return "solar:document-text-bold";
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1">
        <p className="text-default-foreground mb-2 text-lg font-semibold">
          {formData.company}
        </p>
        {formData.notes && (
          <p className="text-small text-default-500 mb-4 line-clamp-2">
            {formData.notes}
          </p>
        )}

        <div className="mb-6 flex flex-col gap-3">
          <div
            className={cn("flex items-start gap-2", {
              hidden: !bookingDate,
            })}
          >
            <Icon
              className="text-default-300 mt-0.5"
              icon="solar:calendar-minimalistic-bold"
              width={16}
            />
            <div className="text-default-600 text-xs font-medium">
              <p>{bookingDate}</p>
            </div>
          </div>

          {selectedTimeSlotRange && selectedTimeSlotRange.length >= 2 && (
            <div className="flex items-center gap-2">
              <Icon
                className="text-default-300"
                icon="solar:clock-circle-bold"
                width={16}
              />
              <p className="text-default-600 text-xs font-medium">
                {`${selectedTimeSlotRange[0].label} - ${selectedTimeSlotRange[1].label}`}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Icon
              className="text-default-300"
              icon="solar:clock-circle-bold"
              width={16}
            />
            <p className="text-default-600 text-xs font-medium">
              {selectedDuration}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Icon
              className="text-default-300"
              icon={getInterviewTypeIcon()}
              width={16}
            />
            <div className="text-default-600 text-xs font-medium flex-1">
              <p>{getInterviewTypeLabel()}</p>
              {formData.type === "offline" && formData.location && (
                <p className="text-default-400 text-xs mt-0.5 line-clamp-1">
                  {formData.location}
                </p>
              )}
              {formData.type === "online" && formData.videoLink && (
                <p className="text-default-400 text-xs mt-0.5 truncate">
                  {formData.videoLink}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Icon
              className="text-default-300"
              icon="solar:document-bold"
              width={16}
            />
            <p className="text-default-600 text-xs font-medium">
              {t(`stages.${formData.stage}`)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <p className="text-default-500 text-xs font-medium mb-2">
          {t("duration")}
        </p>
        <Tabs
          classNames={{
            tab: "h-7 text-xs",
            tabList: "gap-1",
          }}
          selectedKey={selectedDuration}
          size="sm"
          onSelectionChange={onDurationChange}
        >
          {durations.map((duration) => (
            <Tab key={duration.key} title={duration.label} />
          ))}
        </Tabs>
      </div>
    </div>
  );
}
