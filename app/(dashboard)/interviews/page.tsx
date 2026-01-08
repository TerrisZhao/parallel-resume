"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { addToast } from "@heroui/toast";
import {
  Plus,
  MapPin,
  Video,
  Phone,
  Calendar,
  FileText,
  Edit,
  Trash2,
} from "lucide-react";
import { Icon } from "@iconify/react";

import { usePageHeader } from "../use-page-header";

import { Loading } from "@/components/loading";
import InterviewWizard from "@/components/interview-add/interview-wizard";

interface Interview {
  id: number;
  company: string;
  type: "online" | "offline" | "phone" | "other";
  location?: string;
  videoLink?: string;
  resumeId?: number;
  resumeName?: string;
  interviewTime: string;
  stage: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Resume {
  id: number;
  name: string;
}

interface InterviewPreparation {
  id: number;
  interviewId: number;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const STAGES = [
  "applied",
  "screening",
  "technical",
  "onsite",
  "offer",
  "rejected",
];

export default function InterviewsPage() {
  const t = useTranslations("interviews");
  const tCommon = useTranslations("common");
  const { setHeader } = usePageHeader();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(
    null,
  );
  const [draggedItem, setDraggedItem] = useState<Interview | null>(null);
  const [viewingInterview, setViewingInterview] = useState<Interview | null>(
    null,
  );
  const {
    isOpen: isViewOpen,
    onOpen: onViewOpen,
    onClose: onViewClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const [deletingInterview, setDeletingInterview] = useState<Interview | null>(
    null,
  );

  // Wizard initial data for editing
  const [wizardInitialData, setWizardInitialData] = useState<
    | Partial<{
        company: string;
        type: "online" | "offline" | "phone" | "other";
        location: string;
        videoLink: string;
        resumeId: number;
        stage: string;
        notes: string;
      }>
    | undefined
  >(undefined);

  // Set page header
  useEffect(() => {
    setHeader(
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl leading-[32px] font-bold">{t("title")}</h1>
        <Button
          className="px-10 shadow-md"
          color="primary"
          radius="full"
          startContent={<Plus size={18} />}
          variant="shadow"
          onPress={handleAddNew}
        >
          {t("addInterview")}
        </Button>
      </div>,
    );

    return () => setHeader(null);
  }, [setHeader, t]);

  // Fetch interviews and resumes
  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch interviews
      const interviewsRes = await fetch("/api/interviews");

      if (interviewsRes.ok) {
        const data = await interviewsRes.json();

        setInterviews(data.interviews || []);
      }

      // Fetch resumes for dropdown
      const resumesRes = await fetch("/api/resumes");

      if (resumesRes.ok) {
        const data = await resumesRes.json();

        setResumes(data.resumes || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingInterview(null);
    setWizardInitialData(undefined);
    onOpen();
  };

  const handleEdit = (interview: Interview) => {
    setEditingInterview(interview);
    setWizardInitialData({
      company: interview.company,
      type: interview.type,
      location: interview.location,
      videoLink: interview.videoLink,
      resumeId: interview.resumeId,
      stage: interview.stage,
      notes: interview.notes,
    });
    onViewClose();
    onOpen();
  };

  const handleDelete = (interview: Interview) => {
    setDeletingInterview(interview);
    onViewClose();
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!deletingInterview) return;

    try {
      const response = await fetch(`/api/interviews/${deletingInterview.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        addToast({
          title: t("deletedSuccess"),
          color: "success",
        });
        await fetchData();
        onDeleteClose();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting interview:", error);
      addToast({
        title: t("failedToDelete"),
        color: "danger",
      });
    }
  };

  const handleWizardSubmit = async (data: {
    company: string;
    type: "online" | "offline" | "phone" | "other";
    location?: string;
    videoLink?: string;
    resumeId?: number;
    stage: string;
    notes?: string;
    interviewTime: string;
  }) => {
    try {
      const payload = {
        company: data.company,
        type: data.type,
        location: data.location || undefined,
        videoLink: data.videoLink || undefined,
        resumeId: data.resumeId,
        interviewTime: data.interviewTime,
        stage: data.stage,
        notes: data.notes || undefined,
      };

      const response = editingInterview
        ? await fetch(`/api/interviews/${editingInterview.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/interviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (response.ok) {
        addToast({
          title: editingInterview ? t("updatedSuccess") : t("createdSuccess"),
          color: "success",
        });
        await fetchData();
        onClose();
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving interview:", error);
      addToast({
        title: editingInterview ? t("failedToUpdate") : t("failedToCreate"),
        color: "danger",
      });
      throw error;
    }
  };

  const handleDragStart = (interview: Interview) => {
    setDraggedItem(interview);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStage: string) => {
    if (!draggedItem || draggedItem.stage === targetStage) {
      setDraggedItem(null);

      return;
    }

    try {
      const response = await fetch(`/api/interviews/${draggedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draggedItem, stage: targetStage }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Error updating interview stage:", error);
    } finally {
      setDraggedItem(null);
    }
  };

  const getInterviewsByStage = (stage: string) => {
    return interviews
      .filter((interview) => interview.stage === stage)
      .sort(
        (a, b) =>
          new Date(a.interviewTime).getTime() -
          new Date(b.interviewTime).getTime(),
      );
  };

  const getTypeIcon = (type: Interview["type"]) => {
    switch (type) {
      case "online":
        return <Video size={16} />;
      case "offline":
        return <MapPin size={16} />;
      case "phone":
        return <Phone size={16} />;
      default:
        return <Calendar size={16} />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "applied":
        return "default";
      case "screening":
        return "primary";
      case "technical":
        return "secondary";
      case "onsite":
        return "warning";
      case "offer":
        return "success";
      case "rejected":
        return "danger";
      default:
        return "default";
    }
  };

  const handleViewDetails = (interview: Interview) => {
    setViewingInterview(interview);
    onViewOpen();
  };

  const getUpcomingInterviewId = () => {
    const now = new Date().getTime();
    const upcomingInterviews = interviews
      .filter((interview) => new Date(interview.interviewTime).getTime() > now)
      .sort(
        (a, b) =>
          new Date(a.interviewTime).getTime() -
          new Date(b.interviewTime).getTime(),
      );

    return upcomingInterviews.length > 0 ? upcomingInterviews[0].id : null;
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {interviews.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <Icon
            className="text-default-300"
            icon={"solar:case-round-bold-duotone"}
            width={120}
          />
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">{t("noInterviews")}</h3>
            <p className="text-default-500">{t("noInterviewsDescription")}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-hidden">
          <div className="flex h-full">
            {STAGES.map((stage, index) => (
              <div key={stage} className="flex flex-1">
                <div
                  className="flex-1 h-full flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage)}
                >
                  <div className="mb-2 flex items-center justify-between px-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-xs">
                        {t(`stages.${stage}`)}
                      </h3>
                      <Chip
                        color={getStageColor(stage)}
                        size="sm"
                        variant="flat"
                      >
                        {getInterviewsByStage(stage).length}
                      </Chip>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-1.5 space-y-2 pt-5 pb-4">
                    {getInterviewsByStage(stage).map((interview) => {
                      const upcomingId = getUpcomingInterviewId();
                      const isUpcoming = interview.id === upcomingId;

                      return (
                        <Card
                          key={interview.id}
                          draggable
                          isPressable
                          className={`cursor-move hover:shadow-sm transition-all w-full ${
                            isUpcoming
                              ? "bg-primary/10 border-2 border-primary shadow-lg"
                              : ""
                          }`}
                          onDragStart={() => handleDragStart(interview)}
                          onPress={() => handleViewDetails(interview)}
                        >
                          <CardBody className="gap-1 p-2.5">
                            <h4 className="font-medium text-xs truncate">
                              {interview.company}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-default-500">
                              {getTypeIcon(interview.type)}
                              <span className="truncate">
                                {t(
                                  `interviewType${interview.type.charAt(0).toUpperCase()}${interview.type.slice(1)}`,
                                )}
                              </span>
                            </div>
                            {interview.type === "offline" &&
                              interview.location && (
                                <div className="flex items-center gap-1.5 text-xs text-default-500">
                                  <MapPin size={14} />
                                  <span className="truncate">
                                    {interview.location}
                                  </span>
                                </div>
                              )}
                            {interview.type === "online" &&
                              interview.videoLink && (
                                <div className="flex items-center gap-1.5 text-xs text-primary">
                                  <Video size={14} />
                                  <span className="truncate">Video Link</span>
                                </div>
                              )}
                            <div className="flex items-center gap-1.5 text-xs text-default-500">
                              <Calendar size={14} />
                              <span className="truncate">
                                {new Date(
                                  interview.interviewTime,
                                ).toLocaleString()}
                              </span>
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                </div>
                {index < STAGES.length - 1 && (
                  <div className="w-px bg-divider self-stretch" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Interview Modal with Wizard */}
      <Modal
        isOpen={isOpen}
        scrollBehavior="inside"
        size="4xl"
        onOpenChange={onClose}
      >
        <ModalContent>
          {(onClose) => (
            <ModalBody className="p-6">
              <InterviewWizard
                initialData={wizardInitialData}
                resumes={resumes}
                onCancel={onClose}
                onSubmit={handleWizardSubmit}
              />
            </ModalBody>
          )}
        </ModalContent>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={isViewOpen} size="2xl" onOpenChange={onViewClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{viewingInterview?.company}</ModalHeader>
              <ModalBody className="gap-4">
                {viewingInterview && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-default-500 mb-1">
                          {t("interviewType")}
                        </p>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(viewingInterview.type)}
                          <span>
                            {t(
                              `interviewType${viewingInterview.type.charAt(0).toUpperCase()}${viewingInterview.type.slice(1)}`,
                            )}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-default-500 mb-1">
                          {t("stage")}
                        </p>
                        <Chip
                          color={getStageColor(viewingInterview.stage)}
                          variant="flat"
                        >
                          {t(`stages.${viewingInterview.stage}`)}
                        </Chip>
                      </div>
                    </div>
                    {viewingInterview.type === "offline" &&
                      viewingInterview.location && (
                        <div>
                          <p className="text-sm text-default-500 mb-1">
                            {t("location")}
                          </p>
                          <p>{viewingInterview.location}</p>
                        </div>
                      )}
                    {viewingInterview.type === "online" &&
                      viewingInterview.videoLink && (
                        <div>
                          <p className="text-sm text-default-500 mb-1">
                            {t("videoLink")}
                          </p>
                          <a
                            className="text-primary hover:underline"
                            href={viewingInterview.videoLink}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {viewingInterview.videoLink}
                          </a>
                        </div>
                      )}
                    <div>
                      <p className="text-sm text-default-500 mb-1">
                        {t("interviewTime")}
                      </p>
                      <p>
                        {new Date(
                          viewingInterview.interviewTime,
                        ).toLocaleString()}
                      </p>
                    </div>
                    {viewingInterview.resumeName && (
                      <div>
                        <p className="text-sm text-default-500 mb-1">
                          {t("relatedResume")}
                        </p>
                        <div className="flex items-center gap-2">
                          <FileText size={16} />
                          <span>{viewingInterview.resumeName}</span>
                        </div>
                      </div>
                    )}
                    {viewingInterview.notes && (
                      <div>
                        <p className="text-sm text-default-500 mb-1">
                          {t("notes")}
                        </p>
                        <p className="text-sm">{viewingInterview.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button onPress={onClose}>{tCommon("close")}</Button>
                <Button
                  color="danger"
                  startContent={<Trash2 size={16} />}
                  variant="flat"
                  onPress={() =>
                    viewingInterview && handleDelete(viewingInterview)
                  }
                >
                  {t("deleteInterview")}
                </Button>
                <Button
                  color="primary"
                  startContent={<Edit size={16} />}
                  variant="flat"
                  onPress={() =>
                    viewingInterview && handleEdit(viewingInterview)
                  }
                >
                  {t("editInterview")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("deleteInterview")}</ModalHeader>
              <ModalBody>
                <p>{t("deleteConfirm")}</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  {tCommon("cancel")}
                </Button>
                <Button color="danger" onPress={confirmDelete}>
                  {tCommon("delete")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
