"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import { Download, Edit, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@heroui/shared-icons";

import { ResumeData } from "@/types/resume";
import { ResumePreview } from "@/components/resume-preview";

interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId: number | null;
  resumeData?: ResumeData;
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
  onThemeColorChange,
}: ResumePreviewModalProps) {
  const router = useRouter();
  const [previewLanguage, setPreviewLanguage] = useState<"en" | "zh">("en");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [languageInitialized, setLanguageInitialized] = useState(false);
  const [internalResumeData, setInternalResumeData] =
    useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const resumeData = externalResumeData || internalResumeData;

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

  const handleExportPDF = async () => {
    if (!resumeId) return;

    setIsExporting(true);
    try {
      const exportUrl = new URL("/api/export", window.location.origin);

      exportUrl.searchParams.set("id", resumeId.toString());
      if (resumeData?.themeColor) {
        exportUrl.searchParams.set("themeColor", resumeData.themeColor);
      }
      exportUrl.searchParams.set("language", previewLanguage);

      const response = await fetch(exportUrl.toString());

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = resumeData?.fullName
        ? `${resumeData.fullName.replace(/\s+/g, "_")}_Resume.pdf`
        : "Resume.pdf";
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting PDF:", error);
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
          <span>Resume Preview</span>
          <div className="flex gap-2">
            <Button
              color={previewLanguage === "en" ? "primary" : "default"}
              size="sm"
              variant={previewLanguage === "en" ? "solid" : "flat"}
              onPress={() => handleLanguageChange("en")}
            >
              English
            </Button>
            <Button
              color={previewLanguage === "zh" ? "primary" : "default"}
              size="sm"
              variant={previewLanguage === "zh" ? "solid" : "flat"}
              onPress={() => handleLanguageChange("zh")}
            >
              中文
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
              No resume data available
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
                  title="Change theme color"
                />
              </PopoverTrigger>
              <PopoverContent className="p-3">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-default-700">
                    Theme Color
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
                      <span>Custom Color</span>
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
              Edit
            </Button>
            <Button
              color="primary"
              isLoading={isExporting}
              startContent={!isExporting && <Download size={18} />}
              onPress={async () => {
                await handleExportPDF();
                onClose();
              }}
            >
              PDF
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
