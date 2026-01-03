"use client";

import { useState } from "react";
import { format } from "date-fns";
import { type DateValue } from "@heroui/calendar";
import { useTranslations } from "next-intl";

import InterviewInfoStep from "./interview-info-step";
import InterviewTimeStep from "./interview-time-step";
import InterviewConfirmationStep from "./interview-confirmation-step";
import RowSteps from "./row-steps";
import { type TimeSlot } from "./calendar";

export interface InterviewFormData {
  company: string;
  type: "online" | "offline" | "phone" | "other";
  location?: string;
  videoLink?: string;
  resumeId?: number;
  stage: string;
  notes?: string;
}

export interface Resume {
  id: number;
  name: string;
}

type WizardStep = "info" | "time" | "confirmation";

interface InterviewWizardProps {
  resumes: Resume[];
  onSubmit: (data: InterviewFormData & { interviewTime: string }) => Promise<void>;
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
  const [currentStep, setCurrentStep] = useState<WizardStep>("info");
  const [formData, setFormData] = useState<InterviewFormData>({
    company: initialData?.company || "",
    type: initialData?.type || "online",
    location: initialData?.location || "",
    videoLink: initialData?.videoLink || "",
    resumeId: initialData?.resumeId,
    stage: initialData?.stage || "applied",
    notes: initialData?.notes || "",
  });
  const [selectedDate, setSelectedDate] = useState<DateValue | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedTimeSlotRange, setSelectedTimeSlotRange] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInfoNext = (data: InterviewFormData) => {
    setFormData(data);
    setCurrentStep("time");
  };

  const handleTimeNext = (
    date: DateValue,
    time: string,
    timeSlotRange: TimeSlot[]
  ) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setSelectedTimeSlotRange(timeSlotRange);
    setCurrentStep("confirmation");
  };

  const handleBack = () => {
    if (currentStep === "time") {
      setCurrentStep("info");
    } else if (currentStep === "confirmation") {
      setCurrentStep("time");
    }
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      // 将日期和时间组合成 ISO 字符串
      const dateStr = selectedDate.toString(); // YYYY-MM-DD
      const interviewDateTime = `${dateStr}T${selectedTime}:00`;

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
    return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
  };

  const getCurrentStepIndex = () => {
    switch (currentStep) {
      case "info":
        return 0;
      case "time":
        return 1;
      case "confirmation":
        return 2;
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
      <div className="mb-8">
        <RowSteps
          currentStep={getCurrentStepIndex()}
          steps={[
            { title: "Information" },
            { title: "Schedule" },
            { title: "Confirm" },
          ]}
        />
      </div>

      {/* Step Content */}
      {currentStep === "info" && (
        <InterviewInfoStep
          resumes={resumes}
          initialData={formData}
          onNext={handleInfoNext}
          onCancel={onCancel}
        />
      )}

      {currentStep === "time" && (
        <InterviewTimeStep
          onNext={handleTimeNext}
          onBack={handleBack}
          initialDate={selectedDate}
          initialTime={selectedTime}
        />
      )}

      {currentStep === "confirmation" && (
        <InterviewConfirmationStep
          formData={formData}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          selectedTimeSlotRange={selectedTimeSlotRange}
          formattedDateTime={getFormattedDateTime()}
          resumes={resumes}
          isSubmitting={isSubmitting}
          onBack={handleBack}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
