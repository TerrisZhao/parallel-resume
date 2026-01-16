"use client";

import { useState, useRef, useEffect } from "react";
import { Button, ButtonGroup } from "@heroui/button";
import { Divider } from "@heroui/divider";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Download, Edit, Palette, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@heroui/shared-icons";
import { useTranslations } from "next-intl";

import { ResumeData } from "@/types/resume";
import { ResumePreview } from "@/components/resume-preview";

interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId: number | null;
  resumeData?: ResumeData;
  resumeName?: string; // Resume name (not fullName)
  onThemeColorChange?: (color: string) => void;
}

const presetColors = [
  "#000000", // Black
  "#1e40af", // Blue
  "#059669", // Green
  "#dc2626", // Red
  "#7c3aed", // Purple
  "#ea580c", // Orange
  "#0891b2", // Cyan
  "#be185d", // Pink
];

export function ResumePreviewModal({
  isOpen,
  onClose,
  resumeId,
  resumeData: externalResumeData,
  resumeName: externalResumeName,
  onThemeColorChange,
}: ResumePreviewModalProps) {
  const router = useRouter();
  const t = useTranslations("resumePreview");
  const [previewLanguage, setPreviewLanguage] = useState<"en" | "zh">("en");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [languageInitialized, setLanguageInitialized] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "txt">("pdf");
  const [internalResumeData, setInternalResumeData] =
    useState<ResumeData | null>(null);
  const [internalResumeName, setInternalResumeName] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const resumeData = externalResumeData || internalResumeData;
  const resumeName = externalResumeName || internalResumeName;

  // Fetch resume data if not provided
  useEffect(() => {
    if (!externalResumeData && resumeId && isOpen) {
      const fetchResumeData = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/resumes/${resumeId}`);
          const data = await response.json();

          if (response.ok) {
            const resume = data.resume;

            // Save resume name separately
            setInternalResumeName(resume.name || null);

            setInternalResumeData({
              fullName: resume.fullName || "",
              preferredName: resume.preferredName || "",
              phone: resume.phone || "",
              email: resume.email || "",
              location: resume.location || "",
              linkedin: resume.linkedin || "",
              github: resume.github || "",
              website: resume.website || "",
              summary: resume.summary || "",
              keySkills: resume.keySkills || [],
              workExperience: (resume.workExperience || []).map((exp: any) => ({
                id: exp.id?.toString() || Math.random().toString(),
                company: exp.company || "",
                position: exp.position || "",
                startDate: exp.startDate || "",
                endDate: exp.endDate || undefined,
                current: exp.current || false,
                description: exp.description || "",
                responsibilities: exp.responsibilities || [],
              })),
              education: (resume.education || []).map((edu: any) => ({
                id: edu.id?.toString() || Math.random().toString(),
                school: edu.school || "",
                degree: edu.degree || "",
                major: edu.major || "",
                startDate: edu.startDate || "",
                endDate: edu.endDate || undefined,
                current: edu.current || false,
                gpa: edu.gpa || undefined,
              })),
              projects: (resume.projects || []).map((proj: any) => ({
                id: proj.id?.toString() || Math.random().toString(),
                name: proj.name || "",
                role: proj.role || "",
                startDate: proj.startDate || "",
                endDate: proj.endDate || undefined,
                current: proj.current || false,
                description: proj.description || "",
                technologies: proj.technologies || [],
              })),
              additionalInfo: resume.additionalInfo || "",
              themeColor: resume.themeColor || "#000000",
            });

            // Initialize language from saved preference
            const savedLanguage = resume.preferredLanguage || "en";

            setPreviewLanguage(savedLanguage as "en" | "zh");
            setLanguageInitialized(true);
          }
        } catch (error) {
          console.error("Error fetching resume data:", error);
        } finally {
          setIsLoading(false);
        }
      };

      void fetchResumeData();
    }
  }, [resumeId, isOpen, externalResumeData]);

  const handleEdit = () => {
    if (resumeId) {
      onClose();
      router.push(`/resume/${resumeId}`);
    }
  };

  const handleExport = async (format: "pdf" | "txt" = exportFormat) => {
    if (!resumeId) return;

    setIsExporting(true);
    try {
      const exportUrl = new URL("/api/export", window.location.origin);

      exportUrl.searchParams.set("id", resumeId.toString());
      exportUrl.searchParams.set("format", format);
      if (resumeData?.themeColor) {
        exportUrl.searchParams.set("themeColor", resumeData.themeColor);
      }
      exportUrl.searchParams.set("language", previewLanguage);

      const response = await fetch(exportUrl.toString());

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Failed to generate ${format.toUpperCase()}`;

        try {
          const errorData = await response.json();

          if (errorData.error || errorData.details) {
            errorMessage = errorData.details || errorData.error || errorMessage;
          }
        } catch {
          // If response is not JSON, use default error message
        }
        throw new Error(errorMessage);
      }

      // For PDF format, API returns JSON with URL and filename
      if (format === "pdf") {
        const data = await response.json();

        if (data.url) {
          // Use filename from API response if available, otherwise fallback to local data
          // Use resume name, not fullName
          const fileName =
            data.filename ||
            (resumeName
              ? `${resumeName.replace(/\s+/g, "_")}_Resume.pdf`
              : "Resume.pdf");

          console.log("Exporting PDF:", {
            url: data.url,
            filename: fileName,
            apiFilename: data.filename,
          });

          // Fetch PDF from external URL and create blob to set filename correctly
          // (download attribute doesn't work with cross-origin URLs)
          const pdfResponse = await fetch(data.url);

          if (!pdfResponse.ok) {
            throw new Error("Failed to fetch PDF from external URL");
          }

          const blob = await pdfResponse.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");

          a.href = blobUrl;
          a.download = fileName; // This will work with blob URL
          document.body.appendChild(a);
          a.click();

          window.URL.revokeObjectURL(blobUrl);
          document.body.removeChild(a);
        } else {
          throw new Error("PDF URL not found in response");
        }
      } else {
        // For TXT format, API returns file directly
        // Try to get filename from Content-Disposition header, otherwise use local data
        // Use resume name, not fullName
        const contentDisposition = response.headers.get("Content-Disposition");
        let fileName = resumeName
          ? `${resumeName.replace(/\s+/g, "_")}_Resume.${format}`
          : `Resume.${format}`;

        if (contentDisposition) {
          const filenameMatch =
            contentDisposition.match(/filename="?(.+?)"?$/i);

          if (filenameMatch && filenameMatch[1]) {
            fileName = filenameMatch[1];
          }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error(`Error exporting ${format.toUpperCase()}:`, error);
      // You might want to show a toast notification here
      alert(
        error instanceof Error
          ? error.message
          : `Failed to export ${format.toUpperCase()}`,
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleColorChange = async (color: string) => {
    if (onThemeColorChange) {
      onThemeColorChange(color);
    } else if (internalResumeData && resumeId) {
      // Update local state immediately
      setInternalResumeData({ ...internalResumeData, themeColor: color });

      // Save to database
      try {
        await fetch(`/api/resumes/${resumeId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            themeColor: color,
          }),
        });
      } catch (error) {
        console.error("Error saving theme color:", error);
      }
    }
  };

  const handleLanguageChange = async (language: "en" | "zh") => {
    setPreviewLanguage(language);

    // Save language preference if we have resumeId
    if (resumeId && languageInitialized) {
      try {
        await fetch(`/api/resumes/${resumeId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            preferredLanguage: language,
          }),
        });
      } catch (error) {
        console.error("Error saving language preference:", error);
      }
    }
  };

  return (
    <Modal
      hideCloseButton={true}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex justify-between items-center">
          <span>{t("title")}</span>
          <div className="flex gap-2">
            <Button
              color={previewLanguage === "en" ? "primary" : "default"}
              size="sm"
              variant={previewLanguage === "en" ? "solid" : "flat"}
              onPress={() => handleLanguageChange("en")}
            >
              {t("english")}
            </Button>
            <Button
              color={previewLanguage === "zh" ? "primary" : "default"}
              size="sm"
              variant={previewLanguage === "zh" ? "solid" : "flat"}
              onPress={() => handleLanguageChange("zh")}
            >
              {t("chinese")}
            </Button>
            <Button size="sm" variant="flat" onPress={onClose}>
              <CloseIcon />
            </Button>
          </div>
        </ModalHeader>
        <ModalBody>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : resumeData ? (
            <ResumePreview
              data={resumeData}
              language={previewLanguage}
              themeColor={resumeData.themeColor}
            />
          ) : (
            <div className="text-center py-12 text-default-500">
              {t("noData")}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-between">
          {resumeData && (
            <Popover
              isOpen={isColorPickerOpen}
              placement="top-start"
              onOpenChange={setIsColorPickerOpen}
            >
              <PopoverTrigger>
                <button
                  className="w-10 h-10 rounded-full border-3 border-default-300 hover:border-default-400 transition-all shadow-md hover:shadow-lg cursor-pointer"
                  style={{ backgroundColor: resumeData.themeColor }}
                  title={t("changeThemeColor")}
                />
              </PopoverTrigger>
              <PopoverContent className="p-3">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-default-700">
                    {t("themeColor")}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                          resumeData.themeColor === color
                            ? "border-default-700 ring-2 ring-offset-2 ring-default-300"
                            : "border-default-200 hover:border-default-400"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          handleColorChange(color);
                          setIsColorPickerOpen(false);
                        }}
                      />
                    ))}
                  </div>
                  <Divider />
                  <label className="relative block cursor-pointer">
                    <div
                      className={`w-full px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                        !presetColors.includes(
                          resumeData.themeColor || "#000000",
                        )
                          ? "border-default-700 ring-2 ring-offset-2 ring-default-300 bg-default-100"
                          : "border-default-200 hover:border-default-400"
                      }`}
                    >
                      {!presetColors.includes(
                        resumeData.themeColor || "#000000",
                      ) ? (
                        <div
                          className="w-4 h-4 rounded-full border border-default-300"
                          style={{ backgroundColor: resumeData.themeColor }}
                        />
                      ) : (
                        <Palette size={16} />
                      )}
                      <span>{t("customColor")}</span>
                    </div>
                    <input
                      ref={colorInputRef}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      type="color"
                      value={resumeData.themeColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        handleColorChange(e.target.value);
                      }}
                    />
                  </label>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <div className="flex gap-2 ml-auto">
            <Button color="default" onPress={handleEdit}>
              <Edit size={18} />
              {t("edit")}
            </Button>
            <ButtonGroup color="primary" variant="solid">
              <Button
                isLoading={isExporting}
                startContent={!isExporting && <Download size={18} />}
                onPress={async () => {
                  await handleExport(exportFormat);
                  onClose();
                }}
              >
                {t("export")} {exportFormat.toUpperCase()}
              </Button>
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly isLoading={isExporting}>
                    {!isExporting && <ChevronDown size={16} />}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  disallowEmptySelection
                  aria-label="Export format"
                  selectedKeys={[exportFormat]}
                  selectionMode="single"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as "pdf" | "txt";

                    setExportFormat(selected);
                  }}
                >
                  <DropdownItem key="pdf">{t("exportPDF")}</DropdownItem>
                  <DropdownItem key="txt">{t("exportTXT")}</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </ButtonGroup>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
