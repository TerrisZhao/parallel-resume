/**
 * Date utility functions for resume dates
 * Supports internationalization for Chinese and English
 */

/**
 * Format a date string (YYYY-MM) to localized format
 * @param dateStr Date string in YYYY-MM format (e.g., "2020-01")
 * @param language Language code ("en" or "zh")
 * @returns Formatted date string
 * - Chinese: "2020.01"
 * - English: "Jan 2020"
 */
export function formatResumeDate(
  dateStr: string | null | undefined,
  language: "en" | "zh" = "en",
): string {
  if (!dateStr) return "";

  // Handle legacy formats (e.g., "Jan 2020", "2020.01")
  const normalized = normalizeDateString(dateStr);

  if (!normalized) return dateStr; // Return original if you can't parse

  const [year, month] = normalized.split("-");

  if (!year || !month) return dateStr;

  if (language === "zh") {
    // Chinese format: 2020.01
    return `${year}.${month.padStart(2, "0")}`;
  } else {
    // English format: Jan 2020
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthIndex = parseInt(month, 10) - 1;

    if (monthIndex < 0 || monthIndex >= 12) return dateStr;

    return `${monthNames[monthIndex]} ${year}`;
  }
}

/**
 * Normalize various date formats to YYYY-MM
 * @param dateStr Date string in various formats
 * @returns Normalized date string in YYYY-MM format
 */
export function normalizeDateString(dateStr: string): string | null {
  if (!dateStr) return null;

  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Chinese format: 2020.01
  if (/^\d{4}\.\d{2}$/.test(dateStr)) {
    return dateStr.replace(".", "-");
  }

  // English format: Jan 2020, January 2020
  const monthNames = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const monthMatch = dateStr.match(/^([a-z]+)\s+(\d{4})$/i);

  if (monthMatch) {
    const [, monthStr, year] = monthMatch;
    const monthIndex = monthNames.findIndex((m) =>
      monthStr.toLowerCase().startsWith(m),
    );

    if (monthIndex !== -1) {
      const month = (monthIndex + 1).toString().padStart(2, "0");

      return `${year}-${month}`;
    }
  }

  // Format: 2020/01
  if (/^\d{4}\/\d{2}$/.test(dateStr)) {
    return dateStr.replace("/", "-");
  }

  return null;
}

/**
 * Parse year and month from date string
 * @param dateStr Date string in any supported format
 * @returns Object with year and month, or null if invalid
 */
export function parseDateString(
  dateStr: string,
): { year: string; month: string } | null {
  const normalized = normalizeDateString(dateStr);

  if (!normalized) return null;

  const [year, month] = normalized.split("-");

  if (!year || !month) return null;

  return { year, month };
}

/**
 * Create a date string from year and month
 * @param year Year as string
 * @param month Month as string (1-12)
 * @returns Date string in YYYY-MM format
 */
export function createDateString(year: string, month: string): string {
  const paddedMonth = month.padStart(2, "0");

  return `${year}-${paddedMonth}`;
}

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Generate year options for select
 * @param startYear Starting year (default: 1980)
 * @param endYear Ending year (default: current year + 5)
 */
export function getYearOptions(
  startYear: number = 1980,
  endYear: number = getCurrentYear() + 5,
): string[] {
  const years: string[] = [];

  for (let year = endYear; year >= startYear; year--) {
    years.push(year.toString());
  }

  return years;
}

/**
 * Get month options for select
 * @param language Language code ("en" or "zh")
 */
export function getMonthOptions(language: "en" | "zh" = "en"): Array<{
  value: string;
  label: string;
}> {
  if (language === "zh") {
    return Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString().padStart(2, "0"),
      label: `${i + 1}月`,
    }));
  } else {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return monthNames.map((name, i) => ({
      value: (i + 1).toString().padStart(2, "0"),
      label: name,
    }));
  }
}
