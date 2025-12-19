"use client";

import { Select, SelectItem } from "@heroui/select";

import {
  getYearOptions,
  getMonthOptions,
  parseDateString,
  createDateString,
} from "@/lib/utils/date";

interface MonthYearPickerProps {
  value: string; // Date string in YYYY-MM format
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  isDisabled?: boolean;
  language?: "en" | "zh";
}

export function MonthYearPicker({
  value,
  onChange,
  label = "Date",
  placeholder = "Select date",
  isDisabled = false,
  language = "en",
}: MonthYearPickerProps) {
  const parsed = parseDateString(value || "");
  const selectedYear = parsed?.year || "";
  const selectedMonth = parsed?.month || "";

  const yearOptions = getYearOptions();
  const monthOptions = getMonthOptions(language);

  const handleYearChange = (newYear: string) => {
    if (newYear && selectedMonth) {
      onChange(createDateString(newYear, selectedMonth));
    } else if (newYear) {
      // If only year is selected, default to January
      onChange(createDateString(newYear, "01"));
    }
  };

  const handleMonthChange = (newMonth: string) => {
    if (selectedYear && newMonth) {
      onChange(createDateString(selectedYear, newMonth));
    } else if (newMonth) {
      // If only month is selected, default to current year
      const currentYear = new Date().getFullYear().toString();

      onChange(createDateString(currentYear, newMonth));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm text-default-700">{label}</label>}
      <div className="flex gap-2">
        <Select
          classNames={{
            base: "flex-1",
          }}
          isDisabled={isDisabled}
          label={language === "zh" ? "年份" : "Year"}
          placeholder={language === "zh" ? "选择年份" : "Select year"}
          selectedKeys={selectedYear ? [selectedYear] : []}
          size="sm"
          onSelectionChange={(keys) => {
            const year = Array.from(keys)[0] as string;

            handleYearChange(year);
          }}
        >
          {yearOptions.map((year) => (
            <SelectItem key={year}>{year}</SelectItem>
          ))}
        </Select>
        <Select
          classNames={{
            base: "flex-1",
          }}
          isDisabled={isDisabled}
          label={language === "zh" ? "月份" : "Month"}
          placeholder={language === "zh" ? "选择月份" : "Select month"}
          selectedKeys={selectedMonth ? [selectedMonth] : []}
          size="sm"
          onSelectionChange={(keys) => {
            const month = Array.from(keys)[0] as string;

            handleMonthChange(month);
          }}
        >
          {monthOptions.map((option) => (
            <SelectItem key={option.value}>{option.label}</SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}
