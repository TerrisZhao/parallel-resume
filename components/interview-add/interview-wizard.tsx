"use client";

import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { type DateValue } from "@heroui/calendar";
import { useTranslations, useLocale } from "next-intl";

import { type TimeSlot } from "../calendar-booking/calendar";

import InterviewInfoStep from "./interview-info-step";
import InterviewTimeStep from "./interview-time-step";
import CoverLetterStep, { type CoverLetterData } from "./cover-letter-step";
import InterviewConfirmationStep from "./interview-confirmation-step";

import RowSteps from "@/components/row-steps";

export interface InterviewFormData {
  company: string;
  type: "online" | "offline" | "phone" | "other";
  location?: string;
  videoLink?: string;
  resumeId?: number;
  stage: string;
  notes?: string;
  jobDescription?: string;
  coverLetter?: string;
}

export interface Resume {
  id: number;
  name: string;
}

type WizardStep = "info" | "time" | "coverLetter" | "confirmation";

interface InterviewWizardProps {
  resumes: Resume[];
  onSubmit: (
    data: InterviewFormData & { interviewTime?: string },
  ) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<InterviewFormData>;
}

export default function InterviewWizard({
  resumes,
  onSubmit,
  onCancel,
  initialData,
}: InterviewWizardProps) {
  const t = useTranslations("interviews");
  const locale = useLocale();
  const [currentStep, setCurrentStep] = useState<WizardStep>("info");
  const [formData, setFormData] = useState<InterviewFormData>({
    company: initialData?.company || "",
    type: initialData?.type || "online",
    location: initialData?.location || "",
    videoLink: initialData?.videoLink || "",
    resumeId: initialData?.resumeId,
    stage: initialData?.stage || "applied",
    notes: initialData?.notes || "",
    jobDescription: initialData?.jobDescription || "",
    coverLetter: initialData?.coverLetter || "",
  });
  const [selectedDate, setSelectedDate] = useState<DateValue | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedTimeSlotRange, setSelectedTimeSlotRange] = useState<
    TimeSlot[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInfoNext = (data: InterviewFormData) => {
    setFormData(data);
    setCurrentStep("coverLetter");
  };

  const handleCoverLetterNext = (data: CoverLetterData) => {
    setFormData({
      ...formData,
      jobDescription: data.jobDescription,
      coverLetter: data.coverLetter,
    });
    setCurrentStep("time");
  };

  const handleCoverLetterSkip = () => {
    setCurrentStep("time");
  };

  const handleTimeNext = (
    date: DateValue | null,
    time: string,
    timeSlotRange: TimeSlot[],
  ) => {
    if (date) {
      setSelectedDate(date);
    }
    setSelectedTime(time);
    setSelectedTimeSlotRange(timeSlotRange);
    setCurrentStep("confirmation");
  };

  const handleTimeSkip = () => {
    setSelectedDate(null);
    setSelectedTime("");
    setSelectedTimeSlotRange([]);
    setCurrentStep("confirmation");
  };

  const handleBack = () => {
    if (currentStep === "coverLetter") {
      setCurrentStep("info");
    } else if (currentStep === "time") {
      setCurrentStep("coverLetter");
    } else if (currentStep === "confirmation") {
      setCurrentStep("time");
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      let interviewDateTime: string | undefined;

      // 如果选择了日期和时间，则组合成 ISO 字符串
      if (selectedDate && selectedTime) {
        const dateStr = selectedDate.toString(); // YYYY-MM-DD

        interviewDateTime = `${dateStr}T${selectedTime}:00`;
      }

      await onSubmit({
        ...formData,
        interviewTime: interviewDateTime,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormattedDateTime = () => {
    if (!selectedDate || !selectedTime) return "";

    const dateStr = selectedDate.toString();
    const date = new Date(`${dateStr}T${selectedTime}`);

    if (locale === "zh") {
      // 中文格式：2026年1月9日 星期五 下午2:30
      return format(date, "yyyy年M月d日 EEEE a h:mm", { locale: zhCN });
    }

    // 英文格式：Friday, January 9, 2026 at 2:30 PM
    return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
  };

  const getCurrentStepIndex = () => {
    switch (currentStep) {
      case "info":
        return 0;
      case "coverLetter":
        return 1;
      case "time":
        return 2;
      case "confirmation":
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div className="w-full">
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{t("addInterview")}</h2>
      </div>

      {/* Steps Indicator */}
      <div className="mb-8 flex justify-center">
        <RowSteps
          currentStep={getCurrentStepIndex()}
          steps={[
            { title: t("steps.information") },
            { title: t("steps.coverLetter") },
            { title: t("steps.schedule") },
            { title: t("steps.confirm") },
          ]}
        />
      </div>

      {/* Step Content */}
      {currentStep === "info" && (
        <InterviewInfoStep
          initialData={formData}
          resumes={resumes}
          onCancel={onCancel}
          onNext={handleInfoNext}
        />
      )}

      {currentStep === "coverLetter" && (
        <CoverLetterStep
          company={formData.company}
          initialData={{
            jobDescription: formData.jobDescription || "",
            coverLetter: formData.coverLetter || "",
          }}
          resumeId={formData.resumeId}
          onBack={handleBack}
          onNext={handleCoverLetterNext}
          onSkip={handleCoverLetterSkip}
        />
      )}

      {currentStep === "time" && (
        <InterviewTimeStep
          formData={formData}
          initialDate={selectedDate}
          initialTime={selectedTime}
          onBack={handleBack}
          onNext={handleTimeNext}
          onSkip={handleTimeSkip}
        />
      )}

      {currentStep === "confirmation" && (
        <InterviewConfirmationStep
          formData={formData}
          formattedDateTime={getFormattedDateTime()}
          isSubmitting={isSubmitting}
          resumes={resumes}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          selectedTimeSlotRange={selectedTimeSlotRange}
          onBack={handleBack}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
