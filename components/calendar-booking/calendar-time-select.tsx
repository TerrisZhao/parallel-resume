import { ScrollShadow } from "@heroui/scroll-shadow";
import { useMemo } from "react";

import CalendarTime from "./calendar-time";
import { DurationEnum, type TimeSlot, TimeFormatEnum } from "./calendar";

interface CalendarTimeSelectProps {
  duration: DurationEnum;
  selectedTime: string;
  timeFormat: TimeFormatEnum;
  onTimeChange: (time: string, selectedTimeSlotRange?: TimeSlot[]) => void;
  onConfirm: () => void;
}

export default function CalendarTimeSelect({
  duration,
  selectedTime,
  timeFormat,
  onTimeChange,
  onConfirm,
}: CalendarTimeSelectProps) {
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const totalMinutesInDay = 24 * 60;
    const intervalMinutes = duration === DurationEnum.FifteenMinutes ? 15 : 30;

    for (
      let minutes = 0;
      minutes < totalMinutesInDay;
      minutes += intervalMinutes
    ) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;

      const value = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

      if (timeFormat === TimeFormatEnum.TwelveHour) {
        const period = hours >= 12 ? "pm" : "am";
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

        slots.push({
          value,
          label: `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`,
        });
      } else {
        slots.push({
          value,
          label: value,
        });
      }
    }

    return slots;
  }, [timeFormat, duration]);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex h-[350px] w-full">
        <ScrollShadow hideScrollBar className="flex w-full flex-col gap-2">
          {timeSlots.map((slot) => (
            <CalendarTime
              key={slot.value}
              isSelected={slot.value === selectedTime}
              slot={slot}
              timeSlots={timeSlots}
              onConfirm={onConfirm}
              onTimeChange={onTimeChange}
            />
          ))}
        </ScrollShadow>
      </div>
    </div>
  );
}
