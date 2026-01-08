"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Calendar, type DateValue } from "@heroui/calendar";
import { getLocalTimeZone, isWeekend, today } from "@internationalized/date";
import { Button } from "@heroui/button";
import { Tab, Tabs } from "@heroui/tabs";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";

import CalendarTimeSelect from "../calendar-booking/calendar-time-select";
import {
  DurationEnum,
  type TimeSlot,
  TimeFormatEnum,
  timeFormats,
  durations,
} from "../calendar-booking/calendar";
import InterviewDetails from "./interview-details";
import { type InterviewFormData } from "./interview-wizard";

interface InterviewTimeStepProps {
  onNext: (date: DateValue, time: string, timeSlotRange: TimeSlot[]) => void;
  onBack: () => void;
  initialDate?: DateValue | null;
  initialTime?: string;
  formData: InterviewFormData;
}

export default function InterviewTimeStep({
  onNext,
  onBack,
  initialDate,
  initialTime = "",
  formData,
}: InterviewTimeStepProps) {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [selectedDate, setSelectedDate] = useState<DateValue>(
    initialDate || today(getLocalTimeZone()),
  );
  const [selectedTime, setSelectedTime] = useState<string>(initialTime);
  const [selectedTimeSlotRange, setSelectedTimeSlotRange] = useState<
    TimeSlot[]
  >([]);
  const [duration, setDuration] = useState<DurationEnum>(
    DurationEnum.ThirtyMinutes,
  );
  const [timeFormat, setTimeFormat] = useState<TimeFormatEnum>(
    TimeFormatEnum.TwelveHour,
  );

  // 生成默认的时间段预览
  const generateDefaultTimeSlotRange = useMemo(() => {
    const getDurationMinutes = (dur: DurationEnum) => {
      switch (dur) {
        case DurationEnum.FifteenMinutes:
          return 15;
        case DurationEnum.OneHour:
          return 60;
        default:
          return 30;
      }
    };

    const minutes = getDurationMinutes(duration);
    const startTime = "09:00";
    const [startHour, startMin] = startTime.split(":").map(Number);
    const endMinutes = startHour * 60 + startMin + minutes;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;

    const formatTime = (hour: number, min: number) => {
      if (timeFormat === TimeFormatEnum.TwelveHour) {
        const period = hour >= 12 ? "pm" : "am";
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

        return `${displayHour}:${min.toString().padStart(2, "0")} ${period}`;
      }

      return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
    };

    return [
      { value: startTime, label: formatTime(startHour, startMin) },
      {
        value: `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`,
        label: formatTime(endHour, endMin),
      },
    ];
  }, [duration, timeFormat]);

  // 初始化时设置默认时间段
  useEffect(() => {
    setSelectedTimeSlotRange(generateDefaultTimeSlotRange);
  }, [generateDefaultTimeSlotRange]);

  // 当duration或timeFormat改变时，更新默认时间段
  useEffect(() => {
    if (!selectedTime) {
      setSelectedTimeSlotRange(generateDefaultTimeSlotRange);
    }
  }, [duration, timeFormat, selectedTime, generateDefaultTimeSlotRange]);

  const isDateUnavailable = (date: DateValue) => {
    return isWeekend(date, "en-US");
  };

  const onDateChange = (date: DateValue) => {
    setSelectedDate(date);
    setSelectedTime(""); // 重置时间选择
    // 时间范围会通过 useEffect 自动更新为新的默认值
  };

  const onTimeChange = (time: string, timeSlotRange?: TimeSlot[]) => {
    setSelectedTime(time);
    if (timeSlotRange) {
      setSelectedTimeSlotRange(timeSlotRange);
    }
  };

  const handleConfirm = () => {
    onNext(selectedDate, selectedTime, selectedTimeSlotRange);
  };

  const onTimeFormatChange = (selectedKey: React.Key) => {
    const timeFormatIndex = timeFormats.findIndex(
      (tf) => tf.key === selectedKey,
    );

    if (timeFormatIndex !== -1) {
      setTimeFormat(timeFormats[timeFormatIndex].key);
      setSelectedTime(""); // 重置时间选择
      // 时间范围会通过 useEffect 自动更新为新的默认值
    }
  };

  const onDurationChange = (selectedKey: React.Key) => {
    const durationIndex = durations.findIndex((d) => d.key === selectedKey);

    if (durationIndex !== -1) {
      setDuration(durations[durationIndex].key);
      setSelectedTime(""); // 重置时间选择
      // 时间范围会通过 useEffect 自动更新为新的默认值
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-row gap-6 items-stretch">
        {/* 左侧：预览信息 */}
        <div className="flex-shrink-0 h-[357px]">
          <InterviewDetails
            formData={formData}
            selectedDate={selectedDate}
            selectedDuration={duration}
            selectedTimeSlotRange={selectedTimeSlotRange}
            onDurationChange={onDurationChange}
          />
        </div>

        {/* 中间：日历 */}
        <div className="flex-shrink-0 self-start">
          <Calendar
            calendarWidth="372px"
            className="shadow-none dark:bg-transparent"
            classNames={{
              headerWrapper: "bg-transparent px-3 pt-1.5 pb-3",
              title: "text-default-700 text-small font-semibold",
              gridHeader: "bg-transparent shadow-none",
              gridHeaderCell: "font-medium text-default-400 text-xs p-0 w-full",
              gridHeaderRow: "px-3",
              gridBodyRow: "gap-x-1 px-3 mb-1 first:mt-4 last:mb-0",
              gridWrapper: "pb-3",
              cell: "p-1.5 w-full",
              cellButton:
                "w-full h-9 rounded-medium data-selected:shadow-[0_2px_12px_0] data-selected:shadow-primary-300 text-small font-medium",
            }}
            isDateUnavailable={isDateUnavailable}
            value={selectedDate}
            weekdayStyle="short"
            onChange={onDateChange}
          />
        </div>

        {/* 右侧：时间选择 */}
        <div className="flex-1 min-w-[220px] flex flex-col self-start">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <p className="text-small flex items-center">
              <span className="text-default-700">
                {locale === "zh"
                  ? format(selectedDate.toString(), "M月d日 EEE", { locale: zhCN })
                  : format(selectedDate.toString(), "EEE d")}
              </span>
            </p>
            <Tabs
              classNames={{
                tab: "h-6 py-0.5 px-1.5",
                tabList: "p-0.5 rounded-[7px] gap-0.5",
                cursor: "rounded-md",
              }}
              selectedKey={timeFormat}
              size="sm"
              onSelectionChange={onTimeFormatChange}
            >
              {timeFormats.map((format) => (
                <Tab key={format.key} title={format.label} />
              ))}
            </Tabs>
          </div>
          <div className="h-[320px] overflow-hidden">
            <CalendarTimeSelect
              confirmLabel={tCommon("confirm")}
              duration={duration}
              selectedTime={selectedTime}
              timeFormat={timeFormat}
              onConfirm={handleConfirm}
              onTimeChange={onTimeChange}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-start mt-6">
        <Button variant="flat" onPress={onBack}>
          {tCommon("back")}
        </Button>
      </div>
    </div>
  );
}
