"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Image } from "@heroui/image";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { Checkbox } from "@heroui/checkbox";
import { Plus, Edit, Copy, Trash2, FileText, Calendar } from "lucide-react";
import { addToast } from "@heroui/toast";
import { useTranslations, useLocale } from "next-intl";

import { title } from "@/components/primitives";
import { ResumePreviewModal } from "@/components/resume-preview-modal";
import { usePageHeader } from "../use-page-header";

interface Resume {
  id: number;
  name: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  themeColor: string | null;
  preferredLanguage: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ResumeListPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("resume");
  const tCommon = useTranslations("common");
  const {
    isOpen: isNewOpen,
    onOpen: onNewOpen,
    onClose: onNewClose,
  } = useDisclosure();
  const {
    isOpen: isBatchOpen,
    onOpen: onBatchOpen,
    onClose: onBatchClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const {
    isOpen: isPreviewOpen,
    onOpen: onPreviewOpen,
    onClose: onPreviewClose,
  } = useDisclosure();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newResumeName, setNewResumeName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedResumes, setSelectedResumes] = useState<Set<number>>(
    new Set(),
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "single" | "batch";
    resumeId?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewResumeId, setPreviewResumeId] = useState<number | null>(null);

  // Batch update fields
  const [batchPhone, setBatchPhone] = useState("");
  const [batchEmail, setBatchEmail] = useState("");
  const [batchLocation, setBatchLocation] = useState("");
  const [batchLinkedin, setBatchLinkedin] = useState("");
  const [batchGithub, setBatchGithub] = useState("");
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const { setHeader } = usePageHeader();

  // Set page header
  useEffect(() => {
    setHeader(
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className={title({ size: "sm" })}>{t("title")}</h1>
        <div className="flex gap-2">
          {selectedResumes.size > 0 && (
            <>
              <Button color="danger" variant="flat" onPress={handleBatchDelete}>
                {tCommon("delete")} ({selectedResumes.size})
              </Button>
              <Button color="secondary" variant="flat" onPress={onBatchOpen}>
                {t("batchUpdate")} ({selectedResumes.size})
              </Button>
            </>
          )}
          <Button
            className="px-10 shadow-md"
            color="primary"
            radius="full"
            startContent={<Plus size={18}/>}
            variant="shadow"
            onPress={onNewOpen}
          >
            {t("newResume")}
          </Button>
        </div>
      </div>
    );

    return () => setHeader(null);
  }, [setHeader, t, tCommon, selectedResumes.size, onNewOpen, onBatchOpen]);

  // Fetch resumes
  const fetchResumes = async () => {
    try {
      const response = await fetch("/api/resumes");
      const data = await response.json();

      if (response.ok) {
        setResumes(data.resumes);
      } else {
        addToast({
          title: data.error || "Failed to fetch resumes",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
      addToast({
        title: "Failed to fetch resumes",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchResumes();
  }, []);

  // Create new resume
  const handleGetStarted = async () => {
    if (!newResumeName.trim()) {
      addToast({
        title: "Please enter a resume name",
        color: "warning",
      });

      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newResumeName.trim(),
          data: {},
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addToast({
          title: "Resume created successfully",
          color: "success",
        });
        setNewResumeName("");
        onNewClose();
        // Navigate to edit page
        router.push(`/resume/${data.resume.id}`);
      } else {
        addToast({
          title: data.error || "Failed to create resume",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Error creating resume:", error);
      addToast({
        title: "Failed to create resume",
        color: "danger",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Duplicate resume
  const handleDuplicate = async (resumeId: number) => {
    try {
      const response = await fetch(`/api/resumes/${resumeId}/duplicate`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        addToast({
          title: "Resume duplicated successfully",
          color: "success",
        });
        void fetchResumes();
      } else {
        addToast({
          title: data.error || "Failed to duplicate resume",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Error duplicating resume:", error);
      addToast({
        title: "Failed to duplicate resume",
        color: "danger",
      });
    }
  };

  // Delete resume
  const handleDelete = (resumeId: number) => {
    setDeleteTarget({ type: "single", resumeId });
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === "single" && deleteTarget.resumeId) {
        // Single delete
        const response = await fetch(`/api/resumes/${deleteTarget.resumeId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          addToast({
            title: "Resume deleted successfully",
            color: "success",
          });
          void fetchResumes();
          setSelectedResumes((prev) => {
            const newSet = new Set(prev);

            newSet.delete(deleteTarget.resumeId!);

            return newSet;
          });
        } else {
          const data = await response.json();

          addToast({
            title: data.error || "Failed to delete resume",
            color: "danger",
          });
        }
      } else if (deleteTarget.type === "batch") {
        // Batch delete
        const deletePromises = Array.from(selectedResumes).map((resumeId) =>
          fetch(`/api/resumes/${resumeId}`, {
            method: "DELETE",
          }),
        );

        const results = await Promise.allSettled(deletePromises);

        const successes = results.filter(
          (r) => r.status === "fulfilled" && r.value.ok,
        ).length;
        const failures = results.length - successes;

        if (successes > 0) {
          addToast({
            title: `Successfully deleted ${successes} resume${successes > 1 ? "s" : ""}`,
            color: "success",
          });
        }

        if (failures > 0) {
          addToast({
            title: `Failed to delete ${failures} resume${failures > 1 ? "s" : ""}`,
            color: "danger",
          });
        }

        setSelectedResumes(new Set());
        void fetchResumes();
      }
    } catch (error) {
      console.error("Error deleting resume:", error);
      addToast({
        title: "Failed to delete resume",
        color: "danger",
      });
    } finally {
      setIsDeleting(false);
      onDeleteClose();
      setDeleteTarget(null);
    }
  };

  // Toggle selection
  const handleToggleSelection = (resumeId: number) => {
    setSelectedResumes((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(resumeId)) {
        newSet.delete(resumeId);
      } else {
        newSet.add(resumeId);
      }

      return newSet;
    });
  };

  // Select all
  const handleSelectAll = () => {
    if (selectedResumes.size === resumes.length) {
      setSelectedResumes(new Set());
    } else {
      setSelectedResumes(new Set(resumes.map((r) => r.id)));
    }
  };

  // Batch update
  const handleBatchUpdate = async () => {
    if (selectedResumes.size === 0) {
      addToast({
        title: "Please select at least one resume",
        color: "warning",
      });

      return;
    }

    const updates: any = {};

    if (batchPhone) updates.phone = batchPhone;
    if (batchEmail) updates.email = batchEmail;
    if (batchLocation) updates.location = batchLocation;
    if (batchLinkedin) updates.linkedin = batchLinkedin;
    if (batchGithub) updates.github = batchGithub;

    if (Object.keys(updates).length === 0) {
      addToast({
        title: "Please enter at least one field to update",
        color: "warning",
      });

      return;
    }

    setIsBatchUpdating(true);
    try {
      const response = await fetch("/api/resumes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeIds: Array.from(selectedResumes),
          updates,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addToast({
          title: `Updated ${data.updated.length} resume(s) successfully`,
          color: "success",
        });
        setBatchPhone("");
        setBatchEmail("");
        setBatchLocation("");
        setBatchLinkedin("");
        setBatchGithub("");
        onBatchClose();
        void fetchResumes();
      } else {
        addToast({
          title: data.error || "Failed to batch update resumes",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Error batch updating resumes:", error);
      addToast({
        title: "Failed to batch update resumes",
        color: "danger",
      });
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // Batch delete
  const handleBatchDelete = () => {
    if (selectedResumes.size === 0) {
      addToast({
        title: "Please select at least one resume",
        color: "warning",
      });

      return;
    }

    setDeleteTarget({ type: "batch" });
    onDeleteOpen();
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    // Format time (HH:mm)
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    // Format date based on locale
    if (locale === "zh") {
      // Chinese format: 2020-05-01 21:00
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");

      return `${year}-${month}-${day} ${timeStr}`;
    } else {
      // English format: May 1, 2020 21:00
      const dateStr = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return `${dateStr} ${timeStr}`;
    }
  };

  // Handle preview
  const handlePreview = (resumeId: number) => {
    setPreviewResumeId(resumeId);
    onPreviewOpen();
  };

  // Handle preview close - refresh list to get updated data
  const handlePreviewClose = () => {
    onPreviewClose();
    void fetchResumes(); // Refresh the list to get updated theme color and language
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className={title()}>{t("title")}</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {resumes.length === 0 ? (
        <Card className="border-none shadow-none">
          <CardBody className="text-center py-12">
            <FileText className="mx-auto mb-4 text-default-400" size={128} />
            <h3 className="text-xl font-semibold mb-2">{t("noResumes")}</h3>
            <p className="text-default-500 mb-4">
              {t("noResumesDescription")}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Checkbox
              isSelected={
                selectedResumes.size === resumes.length && resumes.length > 0
              }
              onValueChange={handleSelectAll}
            >
              <span className="text-sm text-default-600">
                {t("selectAll")} ({resumes.length})
              </span>
            </Checkbox>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {resumes.map((resume) => (
              <Card
                key={resume.id}
                isFooterBlurred
                className="border-none relative"
                radius="lg"
              >
                <div className="absolute top-2 left-2 z-20">
                  <Checkbox
                    classNames={{
                      wrapper: "bg-background/90 backdrop-blur-sm",
                    }}
                    isSelected={selectedResumes.has(resume.id)}
                    onValueChange={() => handleToggleSelection(resume.id)}
                  />
                </div>
                <Image
                  alt={resume.name}
                  className="object-cover object-top cursor-pointer"
                  height={280}
                  src={`/api/resumes/${resume.id}/thumbnail?color=${encodeURIComponent(resume.themeColor || "#1e40af")}`}
                  width="100%"
                  onClick={() => handlePreview(resume.id)}
                />
                <CardFooter className="justify-between bg-white/50 backdrop-blur-md overflow-hidden absolute rounded-b-large bottom-0 left-0 right-0 shadow-small z-10 flex-col items-start gap-2">
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 flex-1 truncate">
                        {resume.name}
                      </p>
                      <span
                        className={`p-1 rounded text-[10px] font-medium flex-shrink-0 leading-tight ${
                          resume.preferredLanguage === "zh"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                        title={
                          resume.preferredLanguage === "zh"
                            ? "Chinese"
                            : "English"
                        }
                      >
                        {resume.preferredLanguage === "zh" ? "ZH" : "EN"}
                      </span>
                    </div>
                    {/*{resume.fullName && (*/}
                    {/*  <p className="text-xs text-gray-600">{resume.fullName}</p>*/}
                    {/*)}*/}
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-1">
                      <Calendar className="text-gray-500" size={12} />
                      <p className="text-xs text-gray-500">
                        {formatDate(resume.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        isIconOnly
                        className="bg-transparent text-blue-700 hover:bg-blue-200"
                        radius="lg"
                        size="sm"
                        title={tCommon("edit")}
                        variant="light"
                        onPress={() => router.push(`/resume/${resume.id}`)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        isIconOnly
                        className="bg-transparent text-gray-700 hover:bg-gray-200"
                        radius="lg"
                        size="sm"
                        title={t("duplicate")}
                        variant="light"
                        onPress={() => handleDuplicate(resume.id)}
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        isIconOnly
                        className="bg-transparent text-red-700 hover:bg-red-200"
                        radius="lg"
                        size="sm"
                        title={tCommon("delete")}
                        variant="light"
                        onPress={() => handleDelete(resume.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* New Resume Modal */}
      <Modal isOpen={isNewOpen} onClose={onNewClose}>
        <ModalContent>
          <ModalHeader>{t("createNewResume")}</ModalHeader>
          <ModalBody>
            <Input
              label={t("resumeName")}
              placeholder={t("resumeNamePlaceholder")}
              value={newResumeName}
              onChange={(e) => setNewResumeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleGetStarted();
                }
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onNewClose}>
              {tCommon("cancel")}
            </Button>
            <Button
              color="primary"
              isLoading={isCreating}
              onPress={handleGetStarted}
            >
              {tCommon("create")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Batch Update Modal */}
      <Modal isOpen={isBatchOpen} size="2xl" onClose={onBatchClose}>
        <ModalContent>
          <ModalHeader>
            Batch Update ({selectedResumes.size} selected)
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-500 mb-4">
              Update contact information for all selected resumes. Leave fields
              empty to keep existing values.
            </p>
            <div className="space-y-4">
              <Input
                label="Phone"
                placeholder="+1 (555) 123-4567"
                value={batchPhone}
                onChange={(e) => setBatchPhone(e.target.value)}
              />
              <Input
                label="Email"
                placeholder="john.doe@example.com"
                type="email"
                value={batchEmail}
                onChange={(e) => setBatchEmail(e.target.value)}
              />
              <Input
                label="Location"
                placeholder="San Francisco, CA"
                value={batchLocation}
                onChange={(e) => setBatchLocation(e.target.value)}
              />
              <Input
                label="LinkedIn"
                placeholder="linkedin.com/in/johndoe"
                value={batchLinkedin}
                onChange={(e) => setBatchLinkedin(e.target.value)}
              />
              <Input
                label="GitHub"
                placeholder="github.com/johndoe"
                value={batchGithub}
                onChange={(e) => setBatchGithub(e.target.value)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onBatchClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={isBatchUpdating}
              onPress={handleBatchUpdate}
            >
              Update All
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>{tCommon("confirm")}</ModalHeader>
          <ModalBody>
            <p className="text-default-700">
              {deleteTarget?.type === "single"
                ? t("deleteConfirm")
                : t("deleteMultipleConfirm", { count: selectedResumes.size })}
            </p>
            <p className="text-sm text-default-500 mt-2">
              {t("cannotUndo")}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onDeleteClose}>
              {tCommon("cancel")}
            </Button>
            <Button
              color="danger"
              isLoading={isDeleting}
              onPress={confirmDelete}
            >
              {tCommon("delete")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Preview Modal */}
      <ResumePreviewModal
        isOpen={isPreviewOpen}
        resumeId={previewResumeId}
        onClose={handlePreviewClose}
      />
    </div>
  );
}
