"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input, Textarea } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Switch } from "@heroui/switch";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { Tooltip } from "@heroui/tooltip";
import {
  Plus,
  X,
  Eye,
  ArrowLeft,
  Save,
  CheckCircle,
  Edit3,
  GripVertical,
  Sparkles,
} from "lucide-react";
import { addToast } from "@heroui/toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { usePageHeader } from "../../use-page-header";

import {
  ResumeData,
  WorkExperience,
  Education,
  Project,
  SkillGroup,
} from "@/types/resume";
import { ResumePreviewModal } from "@/components/resume-preview-modal";
import { MonthYearPicker } from "@/components/month-year-picker";
import { normalizeDateString } from "@/lib/utils/date";
import { Loading } from "@/components/loading";

// STAR 检测组件
interface StarCheckResult {
  S: boolean;
  T: boolean;
  A: boolean;
  R: boolean;
}

// 批量 STAR 检测组件（用于工作经历的 Responsibilities & Achievements）
function BatchStarIndicator({
  items,
  onConfirmImprovements,
  jobDescription,
}: {
  items: Array<{ id: string; content: string }>;
  onConfirmImprovements: (
    improvements: Array<{ id: string; improvedContent: string }>,
  ) => void;
  jobDescription?: string;
}) {
  const t = useTranslations("resumeEditor");
  const [overallStarResult, setOverallStarResult] =
    useState<StarCheckResult | null>(null);
  const [isLoadingStar, setIsLoadingStar] = useState(false);
  const {
    isOpen: isConfirmOpen,
    onOpen: onConfirmOpen,
    onClose: onConfirmClose,
  } = useDisclosure();
  const [improvements, setImprovements] = useState<
    Array<{ id: string; improvedContent: string; originalContent: string }>
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (items.length === 0 || items.every((item) => !item.content.trim())) {
      addToast({
        title: t("contentEmpty"),
        color: "warning",
      });

      return;
    }

    setIsRefreshing(true);
    setIsLoadingStar(true);
    try {
      const response = await fetch("/api/ai/star-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          jobDescription: jobDescription || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t("detectionFailed"));
      }

      setOverallStarResult(data.overallSatisfied || null);
      setImprovements(
        data.results.map((result: any) => ({
          id: result.id,
          improvedContent: result.improvedContent || "",
          originalContent:
            items.find((item) => item.id === result.id)?.content || "",
        })),
      );
      onConfirmOpen();
    } catch (error) {
      console.error(t("batchStarCheckFailed"), error);
      addToast({
        title: error instanceof Error ? error.message : t("detectionFailed"),
        color: "danger",
      });
    } finally {
      setIsRefreshing(false);
      setIsLoadingStar(false);
    }
  };

  const handleConfirm = () => {
    onConfirmImprovements(
      improvements.map((imp) => ({
        id: imp.id,
        improvedContent: imp.improvedContent,
      })),
    );
    setOverallStarResult(null);
    onConfirmClose();
    addToast({
      title: t("contentUpdated"),
      color: "success",
    });
  };

  const getDotColor = (satisfied: boolean | null) => {
    if (satisfied === null) return "bg-default-300";

    return satisfied ? "bg-success" : "bg-danger";
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Tooltip content={t("aiOptimizationTooltip")}>
          <Button
            isIconOnly
            className={`min-w-8 w-8 h-8 ${
              items.length > 0 &&
              !items.every((item) => !item.content.trim()) &&
              !isRefreshing &&
              !isLoadingStar
                ? "text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400"
                : ""
            }`}
            isDisabled={
              items.length === 0 ||
              items.every((item) => !item.content.trim()) ||
              isRefreshing ||
              isLoadingStar
            }
            isLoading={isRefreshing || isLoadingStar}
            size="sm"
            variant="light"
            onPress={handleRefresh}
          >
            <Sparkles size={14} />
          </Button>
        </Tooltip>
      </div>

      {/* 批量确认对话框 */}
      <Modal isOpen={isConfirmOpen} size="3xl" onClose={onConfirmClose}>
        <ModalContent>
          <ModalHeader>
            <span>{t("confirmOptimizedContent")}</span>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {improvements.map((imp, index) => (
                <div
                  key={imp.id}
                  className="space-y-2 border-b pb-4 last:border-0"
                >
                  <p className="text-sm font-medium">
                    {t("item")} {index + 1}
                  </p>
                  <div>
                    <p className="text-xs text-default-500 mb-1">
                      {t("originalContent")}
                    </p>
                    <p className="text-sm text-default-600 bg-default-100 p-2 rounded">
                      {imp.originalContent}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-default-500 mb-1">
                      {t("optimizedContent")}
                    </p>
                    <Textarea
                      minRows={3}
                      placeholder={t("optimizedContentPlaceholder")}
                      value={imp.improvedContent}
                      onChange={(e) => {
                        const newImprovements = [...improvements];

                        newImprovements[index].improvedContent = e.target.value;
                        setImprovements(newImprovements);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter className="flex items-center justify-between">
            {overallStarResult && (
              <div className="flex items-center gap-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    overallStarResult.S
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Situation (背景情况)"
                >
                  S
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    overallStarResult.T
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Task (任务目标)"
                >
                  T
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    overallStarResult.A
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Action (具体行动)"
                >
                  A
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    overallStarResult.R
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Result (成果影响)"
                >
                  R
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="light" onPress={onConfirmClose}>
                {t("cancel")}
              </Button>
              <Button color="primary" onPress={handleConfirm}>
                {t("confirmUseAll")}
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// 项目描述 STAR 检测组件（独立状态）
function ProjectStarIndicator({
  isEnabled,
  content,
  onConfirmImprovement,
  onContentChange,
  jobDescription,
}: {
  isEnabled: boolean;
  content: string;
  onConfirmImprovement: (improvedContent: string) => void;
  onContentChange?: (value: string) => void;
  jobDescription?: string;
}) {
  const t = useTranslations("resumeEditor");
  const [starResult, setStarResult] = useState<StarCheckResult | null>(null);
  const [isLoadingStar, setIsLoadingStar] = useState(false);
  const {
    isOpen: isConfirmOpen,
    onOpen: onConfirmOpen,
    onClose: onConfirmClose,
  } = useDisclosure();
  const [improvedContent, setImprovedContent] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!content.trim()) {
      addToast({
        title: t("contentEmpty"),
        color: "warning",
      });

      return;
    }

    setIsRefreshing(true);
    setIsLoadingStar(true);
    try {
      const response = await fetch("/api/ai/star-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          jobDescription: jobDescription || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t("detectionFailed"));
      }

      setStarResult(data.satisfied);
      setImprovedContent(data.improvedContent || "");
      onConfirmOpen();
    } catch (error) {
      console.error("STAR检测失败:", error);
      addToast({
        title: error instanceof Error ? error.message : t("detectionFailed"),
        color: "danger",
      });
    } finally {
      setIsRefreshing(false);
      setIsLoadingStar(false);
    }
  };

  const handleConfirm = () => {
    if (improvedContent.trim()) {
      onConfirmImprovement(improvedContent);
      onConfirmClose();
      addToast({
        title: t("contentUpdated"),
        color: "success",
      });
    }
  };

  if (!isEnabled) {
    return (
      <Textarea
        label={t("description")}
        minRows={3}
        placeholder={t("descriptionPlaceholder")}
        value={content}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onContentChange?.(e.target.value)
        }
      />
    );
  }

  const getDotColor = (satisfied: boolean | null) => {
    if (satisfied === null) return "bg-default-300";

    return satisfied ? "bg-success" : "bg-danger";
  };

  return (
    <>
      <Textarea
        endContent={
          <Tooltip content={t("aiOptimizationTooltip")}>
            <Button
              isIconOnly
              className={`min-w-8 w-8 h-8 ${
                content.trim() && !isRefreshing && !isLoadingStar
                  ? "text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400"
                  : ""
              }`}
              isDisabled={!content.trim() || isRefreshing || isLoadingStar}
              isLoading={isRefreshing || isLoadingStar}
              size="sm"
              variant="light"
              onPress={handleRefresh}
            >
              <Sparkles size={14} />
            </Button>
          </Tooltip>
        }
        label={t("description")}
        minRows={3}
        placeholder={t("descriptionPlaceholder")}
        value={content}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onContentChange?.(e.target.value)
        }
      />
      {/* 确认对话框 */}
      <Modal isOpen={isConfirmOpen} size="2xl" onClose={onConfirmClose}>
        <ModalContent>
          <ModalHeader>
            <span>{t("confirmOptimizedContent")}</span>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">
                  {t("originalContent")}
                </p>
                <p className="text-sm text-default-600 bg-default-100 p-3 rounded">
                  {content}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">
                  {t("optimizedContent")}
                </p>
                <Textarea
                  minRows={5}
                  placeholder={t("optimizedContentPlaceholder")}
                  value={improvedContent}
                  onChange={(e) => setImprovedContent(e.target.value)}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="flex items-center justify-between">
            {starResult && (
              <div className="flex items-center gap-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    starResult.S
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Situation (背景情况)"
                >
                  S
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    starResult.T
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Task (任务目标)"
                >
                  T
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    starResult.A
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Action (具体行动)"
                >
                  A
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    starResult.R
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Result (成果影响)"
                >
                  R
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="light" onPress={onConfirmClose}>
                {t("cancel")}
              </Button>
              <Button color="primary" onPress={handleConfirm}>
                {t("confirmUse")}
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function StarIndicator({
  isEnabled,
  starResult,
  isLoading,
  onRefresh,
  content,
  onConfirmImprovement,
  jobDescription,
}: {
  isEnabled: boolean;
  starResult: StarCheckResult | null;
  isLoading: boolean;
  onRefresh: () => void;
  content: string;
  onConfirmImprovement: (improvedContent: string) => void;
  jobDescription?: string;
}) {
  const t = useTranslations("resumeEditor");
  const {
    isOpen: isConfirmOpen,
    onOpen: onConfirmOpen,
    onClose: onConfirmClose,
  } = useDisclosure();
  const [improvedContent, setImprovedContent] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localStarResult, setLocalStarResult] =
    useState<StarCheckResult | null>(starResult);

  // 同步外部 starResult
  useEffect(() => {
    setLocalStarResult(starResult);
  }, [starResult]);

  const handleRefresh = async () => {
    if (!content.trim()) {
      addToast({
        title: t("contentEmpty"),
        color: "warning",
      });

      return;
    }

    setIsRefreshing(true);
    onRefresh(); // 通知父组件开始加载
    try {
      const response = await fetch("/api/ai/star-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          jobDescription: jobDescription || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t("detectionFailed"));
      }

      setLocalStarResult(data.satisfied);
      setImprovedContent(data.improvedContent || "");
      onConfirmOpen(); // 打开确认对话框
    } catch (error) {
      console.error("STAR检测失败:", error);
      addToast({
        title: error instanceof Error ? error.message : t("detectionFailed"),
        color: "danger",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConfirm = () => {
    if (improvedContent.trim()) {
      onConfirmImprovement(improvedContent);
      setLocalStarResult(null); // 重置检测结果，让用户重新检测新内容
      onConfirmClose();
      addToast({
        title: t("contentUpdated"),
        color: "success",
      });
    }
  };

  if (!isEnabled) {
    return null;
  }

  const getDotColor = (satisfied: boolean | null) => {
    if (satisfied === null) return "bg-default-300";

    return satisfied ? "bg-success" : "bg-danger";
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Tooltip content={t("aiOptimizationTooltip")}>
          <Button
            isIconOnly
            className={`min-w-8 w-8 h-8 ${
              content.trim() && !isRefreshing && !isLoading
                ? "text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400"
                : ""
            }`}
            isDisabled={!content.trim() || isRefreshing || isLoading}
            isLoading={isRefreshing || isLoading}
            size="sm"
            variant="light"
            onPress={handleRefresh}
          >
            <Sparkles size={14} />
          </Button>
        </Tooltip>
      </div>

      {/* 确认对话框 */}
      <Modal isOpen={isConfirmOpen} size="2xl" onClose={onConfirmClose}>
        <ModalContent>
          <ModalHeader>
            <span>{t("confirmOptimizedContent")}</span>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">
                  {t("originalContent")}
                </p>
                <p className="text-sm text-default-600 bg-default-100 p-3 rounded">
                  {content}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">
                  {t("optimizedContent")}
                </p>
                <Textarea
                  minRows={5}
                  placeholder={t("optimizedContentPlaceholder")}
                  value={improvedContent}
                  onChange={(e) => setImprovedContent(e.target.value)}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="flex items-center justify-between">
            {localStarResult && (
              <div className="flex items-center gap-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    localStarResult.S
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Situation (背景情况)"
                >
                  S
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    localStarResult.T
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Task (任务目标)"
                >
                  T
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    localStarResult.A
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Action (具体行动)"
                >
                  A
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    localStarResult.R
                      ? "bg-success text-success-foreground"
                      : "bg-danger text-danger-foreground"
                  }`}
                  title="Result (成果影响)"
                >
                  R
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="light" onPress={onConfirmClose}>
                {t("cancel")}
              </Button>
              <Button color="primary" onPress={handleConfirm}>
                {t("confirmUse")}
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// Editable Name Component
function EditableName({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: (name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const handleStartEdit = () => {
    setEditValue(name);
    setIsEditing(true);
  };

  const handleEndEdit = () => {
    onNameChange(editValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        aria-label="Resume Name"
        classNames={{ inputWrapper: "min-h-10", input: "text-base" }}
        size="sm"
        value={editValue}
        onBlur={handleEndEdit}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setEditValue(e.target.value)
        }
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleEndEdit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      className="text-left focus:outline-none min-h-10 flex items-center"
      type="button"
      onClick={handleStartEdit}
    >
      <span className="text-3xl leading-6 font-semibold">{name || "Resume"}</span>
      <span className="ml-2 text-xs text-default-500 hidden sm:inline-flex items-center gap-1">
        <Edit3 size={14} />
      </span>
    </button>
  );
}

// Sortable Skill Item Component
function SortableSkillItem({
  skill,
  onRemove,
}: {
  skill: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: skill,
    animateLayoutChanges: () => true,
    transition: {
      duration: 300,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)",
    opacity: isDragging ? 0.3 : 1,
    width: "fit-content",
    flexShrink: 0,
  };

  return (
    <div ref={setNodeRef} className="inline-flex items-center" style={style}>
      <Chip
        endContent={
          <button className="ml-1" onClick={onRemove}>
            <X size={14} />
          </button>
        }
        startContent={
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="text-default-400" size={14} />
          </div>
        }
      >
        {skill}
      </Chip>
    </div>
  );
}

// Sortable Responsibility Item Component
function SortableResponsibilityItem({
  responsibility,
  index,
  expId,
  onUpdate,
  onRemove,
}: {
  responsibility: string;
  index: number;
  expId: string;
  onUpdate: (value: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${expId}-resp-${index}`,
    animateLayoutChanges: () => true,
    transition: {
      duration: 300,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)",
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} className="flex gap-2" style={style}>
      <div className="flex items-start pt-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="text-default-400" size={18} />
        </div>
      </div>
      <Textarea
        minRows={2}
        placeholder="Describe your responsibility or achievement..."
        value={responsibility}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onUpdate(e.target.value)
        }
      />
      <Button
        isIconOnly
        color="danger"
        size="sm"
        variant="light"
        onPress={onRemove}
      >
        <X size={18} />
      </Button>
    </div>
  );
}

// Sortable Group Component
function SortableGroup({
  group,
  onUpdateName,
  onRemove,
  onAddSkill,
  onRemoveSkill,
  onSkillDragStart,
  onSkillDragEnd,
}: {
  group: SkillGroup;
  onUpdateName: (name: string) => void;
  onRemove: () => void;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skillIndex: number) => void;
  onSkillDragStart: (event: DragStartEvent) => void;
  onSkillDragEnd: (event: DragEndEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    animateLayoutChanges: () => true,
    transition: {
      duration: 300,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const [localActiveSkillId, setLocalActiveSkillId] = useState<string | null>(
    null,
  );
  const [skillInputValue, setSkillInputValue] = useState("");

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)",
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="bg-default-50 shadow-none border-2 border-dashed border-default-300">
        <CardBody className="space-y-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="text-default-400" size={18} />
              </div>
              <Input
                className="flex-1"
                size="sm"
                value={group.groupName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdateName(e.target.value)
                }
              />
            </div>
            <Button
              isIconOnly
              color="danger"
              size="sm"
              variant="light"
              onPress={onRemove}
            >
              <X size={18} />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add skill and press Enter"
              size="sm"
              value={skillInputValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSkillInputValue(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (skillInputValue.trim()) {
                    onAddSkill(skillInputValue);
                    setSkillInputValue("");
                  }
                }
              }}
            />
          </div>
          <DndContext
            collisionDetection={closestCenter}
            sensors={useSensors(
              useSensor(PointerSensor),
              useSensor(KeyboardSensor, {
                coordinateGetter: sortableKeyboardCoordinates,
              }),
            )}
            onDragEnd={(e) => {
              setLocalActiveSkillId(null);
              onSkillDragEnd(e);
            }}
            onDragStart={(e) => {
              setLocalActiveSkillId(e.active.id as string);
              onSkillDragStart(e);
            }}
          >
            <SortableContext
              items={group.skills}
              strategy={rectSortingStrategy}
            >
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill, skillIndex) => (
                  <SortableSkillItem
                    key={skill}
                    skill={skill}
                    onRemove={() => onRemoveSkill(skillIndex)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {localActiveSkillId ? (
                <div className="flex items-center">
                  <Chip>{localActiveSkillId}</Chip>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </CardBody>
      </Card>
    </div>
  );
}

export default function ResumeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const t = useTranslations("resumeEditor");
  const { setHeader } = usePageHeader();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [resumeData, setResumeData] = useState<
    ResumeData & { name?: string; preferredLanguage?: string }
  >({
    name: "",
    fullName: "",
    preferredName: "",
    phone: "",
    email: "",
    location: "",
    linkedin: "",
    github: "",
    website: "",
    jobDescription: "",
    summary: "",
    keySkills: [],
    workExperience: [],
    education: [],
    projects: [],
    additionalInfo: "",
    themeColor: "#000000",
    preferredLanguage: "en",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isAiOptimizationEnabled, setIsAiOptimizationEnabled] = useState(false);
  const [techInputValues, setTechInputValues] = useState<Record<string, string>>(
    {},
  );

  // Summary enhancement states
  const [isSummaryEnhancing, setIsSummaryEnhancing] = useState(false);
  const {
    isOpen: isSummaryModalOpen,
    onOpen: onSummaryModalOpen,
    onClose: onSummaryModalClose,
  } = useDisclosure();
  const [enhancedSummaries, setEnhancedSummaries] = useState<{
    professional: string;
    innovative: string;
    technical: string;
  } | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<string>("");

  // Skill suggestions states
  const [isSkillSuggesting, setIsSkillSuggesting] = useState(false);
  const {
    isOpen: isSkillModalOpen,
    onOpen: onSkillModalOpen,
    onClose: onSkillModalClose,
  } = useDisclosure();
  const [skillOptimization, setSkillOptimization] = useState<{
    optimizedGroups: SkillGroup[];
    reasoning: string;
    changesCount: {
      added: number;
      removed: number;
      reorganized: number;
    };
  } | null>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle summary enhancement
  const handleEnhanceSummary = async () => {
    // Check if there's enough content to generate meaningful summaries
    const hasWorkExp =
      resumeData.workExperience && resumeData.workExperience.length > 0;
    const hasProjects = resumeData.projects && resumeData.projects.length > 0;
    const hasEducation =
      resumeData.education && resumeData.education.length > 0;

    if (!hasWorkExp && !hasProjects && !hasEducation) {
      addToast({
        title: t("needMoreContent"),
        description: t("fillWorkOrProjectsFirst"),
        color: "warning",
      });

      return;
    }

    setIsSummaryEnhancing(true);
    try {
      const response = await fetch("/api/ai/enhance-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workExperiences: resumeData.workExperience,
          projects: resumeData.projects,
          education: resumeData.education,
          jobDescription: resumeData.jobDescription || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t("enhancementFailed"));
      }

      setEnhancedSummaries(data.summaries);
      setSelectedSummary(data.summaries.professional);
      onSummaryModalOpen();
    } catch (error) {
      console.error("Summary enhancement failed:", error);
      addToast({
        title: error instanceof Error ? error.message : t("enhancementFailed"),
        color: "danger",
      });
    } finally {
      setIsSummaryEnhancing(false);
    }
  };

  // Handle skill optimization
  const handleGetSkillSuggestions = async () => {
    // Check if there are skills to optimize
    const skillGroups = resumeData.keySkills as SkillGroup[];
    const hasSkills =
      skillGroups && skillGroups.length > 0 && skillGroups.some((g) => g.skills.length > 0);

    if (!hasSkills) {
      addToast({
        title: t("needSkillsFirst"),
        description: t("addSomeSkillsFirst"),
        color: "warning",
      });

      return;
    }

    // Check if there's context to optimize (work experience or projects)
    const hasContext =
      (resumeData.workExperience && resumeData.workExperience.length > 0) ||
      (resumeData.projects && resumeData.projects.length > 0);

    setIsSkillSuggesting(true);
    try {
      const response = await fetch("/api/ai/skill-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSkillGroups: resumeData.keySkills as SkillGroup[],
          workExperiences: resumeData.workExperience,
          projects: resumeData.projects,
          jobDescription: resumeData.jobDescription || undefined,
          hasContext, // Tell API if we have context
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t("optimizationFailed"));
      }

      // Add IDs to optimized groups
      const optimizedGroupsWithIds = data.optimizedGroups.map(
        (group: { groupName: string; skills: string[] }) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          groupName: group.groupName,
          skills: group.skills,
        }),
      );

      setSkillOptimization({
        optimizedGroups: optimizedGroupsWithIds,
        reasoning: data.reasoning,
        changesCount: data.changesCount,
      });
      onSkillModalOpen();
    } catch (error) {
      console.error("Skill optimization failed:", error);
      addToast({
        title: error instanceof Error ? error.message : t("optimizationFailed"),
        color: "danger",
      });
    } finally {
      setIsSkillSuggesting(false);
    }
  };

  // Load resume data
  useEffect(() => {
    const fetchResume = async () => {
      try {
        const response = await fetch(`/api/resumes/${resolvedParams.id}`);
        const data = await response.json();

        if (response.ok) {
          const resume = data.resume;

          const skills = resume.keySkills || [];
          // Always convert to grouped format
          let groupedSkills: SkillGroup[];

          if (
            skills.length > 0 &&
            typeof skills[0] === "object" &&
            "groupName" in skills[0]
          ) {
            // Already in grouped format
            groupedSkills = skills;
          } else if (skills.length > 0) {
            // Convert simple list to grouped format
            groupedSkills = [
              {
                id: Date.now().toString(),
                groupName: "Skills",
                skills: skills as string[],
              },
            ];
          } else {
            // Empty skills
            groupedSkills = [];
          }

          setResumeData({
            name: resume.name,
            fullName: resume.fullName || "",
            preferredName: resume.preferredName || "",
            phone: resume.phone || "",
            email: resume.email || "",
            location: resume.location || "",
            linkedin: resume.linkedin || "",
            github: resume.github || "",
            website: resume.website || "",
            jobDescription: resume.jobDescription || "",
            summary: resume.summary || "",
            keySkills: groupedSkills,
            workExperience: resume.workExperience || [],
            education: resume.education || [],
            projects: resume.projects || [],
            additionalInfo: resume.additionalInfo || "",
            themeColor: resume.themeColor || "#000000",
            preferredLanguage: resume.preferredLanguage || "en",
          });
          setIsAiOptimizationEnabled(resume.aiOptimizationEnabled ?? false);
          setLastSaved(new Date(resume.updatedAt));
        } else {
          addToast({
            title: data.error || t("failedToLoadResume"),
            color: "danger",
          });
          router.push("/resume");
        }
      } catch (error) {
        console.error("Error loading resume:", error);
        addToast({
          title: t("failedToLoadResume"),
          color: "danger",
        });
        router.push("/resume");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchResume();
  }, [resolvedParams.id, router, t]);

  // Auto-save function with debounce
  const autoSave = useCallback(
    async (data: typeof resumeData) => {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/resumes/${resolvedParams.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            data: {
              fullName: data.fullName,
              preferredName: data.preferredName,
              phone: data.phone,
              email: data.email,
              location: data.location,
              linkedin: data.linkedin,
              github: data.github,
              website: data.website,
              jobDescription: data.jobDescription,
              summary: data.summary,
              keySkills: data.keySkills,
              workExperience: data.workExperience,
              education: data.education,
              projects: data.projects,
              additionalInfo: data.additionalInfo,
              themeColor: data.themeColor,
            },
          }),
        });

        if (response.ok) {
          setLastSaved(new Date());
        } else {
          console.error("Auto-save failed");
        }
      } catch (error) {
        console.error("Auto-save error:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [resolvedParams.id],
  );

  // Trigger auto-save with debounce
  useEffect(() => {
    if (!isLoading && resumeData.name) {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const timeout = setTimeout(() => {
        void autoSave(resumeData);
      }, 1500); // Auto-save after 1.5 seconds of inactivity

      setSaveTimeout(timeout);

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [resumeData, isLoading, autoSave]);

  // Set page header
  useEffect(() => {
    setHeader(
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={() => router.push("/resume")}
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="min-h-10 flex items-center">
            <EditableName
              name={resumeData.name || ""}
              onNameChange={(newName) =>
                setResumeData((prev) => ({ ...prev, name: newName }))
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-4 min-h-10">
          {isSaving ? (
            <div className="text-sm text-default-500 flex items-center gap-1">
              <Save className="animate-pulse" size={14} />
              {t("saving")}
            </div>
          ) : lastSaved ? (
            <div className="text-sm text-success flex items-center gap-1">
              <CheckCircle size={14} />
              {t("saved")} {lastSaved.toLocaleTimeString()}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <span className="text-sm text-default-600">
              {t("aiOptimization")}
            </span>
            <Switch
              isSelected={isAiOptimizationEnabled}
              size="sm"
              onValueChange={async (value) => {
                setIsAiOptimizationEnabled(value);
                try {
                  const response = await fetch(
                    `/api/resumes/${resolvedParams.id}`,
                    {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        aiOptimizationEnabled: value,
                      }),
                    },
                  );

                  if (!response.ok) {
                    const error = await response.json();

                    addToast({
                      title:
                        error.error ||
                        "Failed to update AI optimization setting",
                      color: "danger",
                    });
                    // Revert state on error
                    setIsAiOptimizationEnabled(!value);
                  }
                } catch (error) {
                  console.error(
                    "Error updating AI optimization setting:",
                    error,
                  );
                  addToast({
                    title: "Failed to update AI optimization setting",
                    color: "danger",
                  });
                  // Revert state on error
                  setIsAiOptimizationEnabled(!value);
                }
              }}
            />
          </div>
          <Button
            className="px-4 shadow-md"
            color="primary"
            radius="full"
            size="sm"
            startContent={<Eye size={18} />}
            variant="shadow"
            onPress={onOpen}
          >
            {t("preview")}
          </Button>
        </div>
      </div>,
    );

    return () => setHeader(null);
  }, [
    setHeader,
    router,
    resumeData.name,
    isSaving,
    lastSaved,
    isAiOptimizationEnabled,
    resolvedParams.id,
    t,
    onOpen,
  ]);

  // Skill group functions
  const handleAddSkillGroup = () => {
    const skillGroups = resumeData.keySkills as SkillGroup[];
    const newGroup: SkillGroup = {
      id: Date.now().toString(),
      groupName: `Group ${skillGroups.length + 1}`,
      skills: [],
    };

    setResumeData({
      ...resumeData,
      keySkills: [...skillGroups, newGroup],
    });
  };

  const handleRemoveSkillGroup = (groupId: string) => {
    setResumeData({
      ...resumeData,
      keySkills: (resumeData.keySkills as SkillGroup[]).filter(
        (g) => g.id !== groupId,
      ),
    });
  };

  const handleUpdateGroupName = (groupId: string, newName: string) => {
    setResumeData({
      ...resumeData,
      keySkills: (resumeData.keySkills as SkillGroup[]).map((g) =>
        g.id === groupId ? { ...g, groupName: newName } : g,
      ),
    });
  };

  const handleAddSkillToGroup = (groupId: string, skill: string) => {
    const newSkill = skill.trim();

    if (!newSkill) return false;

    let added = false;

    setResumeData({
      ...resumeData,
      keySkills: (resumeData.keySkills as SkillGroup[]).map((g) => {
        if (g.id !== groupId) return g;

        const exists = g.skills.some(
          (existing) =>
            existing.trim().toLowerCase() === newSkill.toLowerCase(),
        );

        if (exists) return g;

        added = true;

        return { ...g, skills: [...g.skills, newSkill] };
      }),
    });

    return added;
  };

  const handleRemoveSkillFromGroup = (groupId: string, skillIndex: number) => {
    setResumeData({
      ...resumeData,
      keySkills: (resumeData.keySkills as SkillGroup[]).map((g) =>
        g.id === groupId
          ? { ...g, skills: g.skills.filter((_, i) => i !== skillIndex) }
          : g,
      ),
    });
  };

  // Handle skill drag and drop within a group
  const handleSkillInGroupDragStart = (event: DragStartEvent) => {
    setActiveSkillId(event.active.id as string);
  };

  const handleSkillInGroupDragEnd = (groupId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setResumeData({
        ...resumeData,
        keySkills: (resumeData.keySkills as SkillGroup[]).map((group) => {
          if (group.id !== groupId) return group;

          const oldIndex = group.skills.indexOf(active.id as string);
          const newIndex = group.skills.indexOf(over.id as string);

          return {
            ...group,
            skills: arrayMove(group.skills, oldIndex, newIndex),
          };
        }),
      });
    }
    setActiveSkillId(null);
  };

  // Handle group drag and drop
  const handleGroupDragStart = (event: DragStartEvent) => {
    setActiveGroupId(event.active.id as string);
  };

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const groups = resumeData.keySkills as SkillGroup[];
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);

      setResumeData({
        ...resumeData,
        keySkills: arrayMove(groups, oldIndex, newIndex),
      });
    }
    setActiveGroupId(null);
  };

  // Add work experience
  const handleAddWorkExperience = () => {
    const newExp: WorkExperience = {
      id: Date.now().toString(),
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
      responsibilities: [""],
    };

    setResumeData({
      ...resumeData,
      workExperience: [...resumeData.workExperience, newExp],
    });
  };

  // Update work experience
  const handleUpdateWorkExperience = (
    id: string,
    field: string,
    value: any,
  ) => {
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp,
      ),
    });
  };

  // Remove work experience
  const handleRemoveWorkExperience = (id: string) => {
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.filter((exp) => exp.id !== id),
    });
  };

  // Add responsibility to work experience
  const handleAddResponsibility = (expId: string) => {
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map((exp) =>
        exp.id === expId
          ? { ...exp, responsibilities: [...exp.responsibilities, ""] }
          : exp,
      ),
    });
  };

  // Update responsibility
  const handleUpdateResponsibility = (
    expId: string,
    index: number,
    value: string,
  ) => {
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              responsibilities: exp.responsibilities.map((resp, i) =>
                i === index ? value : resp,
              ),
            }
          : exp,
      ),
    });
  };

  // Remove responsibility
  const handleRemoveResponsibility = (expId: string, index: number) => {
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              responsibilities: exp.responsibilities.filter(
                (_, i) => i !== index,
              ),
            }
          : exp,
      ),
    });
  };

  // Handle responsibility drag and drop
  const handleResponsibilityDragEnd = (expId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setResumeData({
        ...resumeData,
        workExperience: resumeData.workExperience.map((exp) => {
          if (exp.id !== expId) return exp;

          const activeIndex = parseInt(
            (active.id as string).split("-resp-")[1],
          );
          const overIndex = parseInt((over.id as string).split("-resp-")[1]);

          return {
            ...exp,
            responsibilities: arrayMove(
              exp.responsibilities,
              activeIndex,
              overIndex,
            ),
          };
        }),
      });
    }
  };

  // Add education
  const handleAddEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      school: "",
      degree: "",
      major: "",
      startDate: "",
      endDate: "",
      current: false,
      gpa: "",
    };

    setResumeData({
      ...resumeData,
      education: [...resumeData.education, newEdu],
    });
  };

  // Update education
  const handleUpdateEducation = (id: string, field: string, value: any) => {
    setResumeData({
      ...resumeData,
      education: resumeData.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu,
      ),
    });
  };

  // Remove education
  const handleRemoveEducation = (id: string) => {
    setResumeData({
      ...resumeData,
      education: resumeData.education.filter((edu) => edu.id !== id),
    });
  };

  // Add project
  const handleAddProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: "",
      role: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
      technologies: [],
    };

    setResumeData({
      ...resumeData,
      projects: [...resumeData.projects, newProject],
    });
  };

  // Update project
  const handleUpdateProject = (id: string, field: string, value: any) => {
    setResumeData({
      ...resumeData,
      projects: resumeData.projects.map((proj) =>
        proj.id === id ? { ...proj, [field]: value } : proj,
      ),
    });
  };

  // Remove project
  const handleRemoveProject = (id: string) => {
    setResumeData({
      ...resumeData,
      projects: resumeData.projects.filter((proj) => proj.id !== id),
    });
  };

  // Add technology to project
  const handleAddTechnology = (projId: string, tech: string) => {
    if (tech.trim()) {
      setResumeData({
        ...resumeData,
        projects: resumeData.projects.map((proj) =>
          proj.id === projId
            ? { ...proj, technologies: [...proj.technologies, tech.trim()] }
            : proj,
        ),
      });
    }
  };

  // Remove technology from project
  const handleRemoveTechnology = (projId: string, index: number) => {
    setResumeData({
      ...resumeData,
      projects: resumeData.projects.map((proj) =>
        proj.id === projId
          ? {
              ...proj,
              technologies: proj.technologies.filter((_, i) => i !== index),
            }
          : proj,
      ),
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="space-y-6 pb-5">
        {/* Job Description - Only show when AI optimization is enabled */}
        {isAiOptimizationEnabled && (
          <Card>
            <CardBody className="space-y-4">
              <h3 className="text-lg font-semibold">{t("jobDescription")}</h3>
              <Textarea
                description={t("jobDescriptionHelpText")}
                label={t("jobDescriptionLabel")}
                minRows={4}
                placeholder={t("jobDescriptionPlaceholder")}
                value={resumeData.jobDescription || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResumeData({
                    ...resumeData,
                    jobDescription: e.target.value,
                  })
                }
              />
            </CardBody>
          </Card>
        )}

        {/* Personal Information */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg font-semibold">
              {t("personalInformation")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t("fullName")}
                placeholder={t("fullNamePlaceholder")}
                value={resumeData.fullName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResumeData({ ...resumeData, fullName: e.target.value })
                }
              />
              <Input
                label={t("preferredName")}
                placeholder={t("preferredNamePlaceholder")}
                value={resumeData.preferredName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResumeData({
                    ...resumeData,
                    preferredName: e.target.value,
                  })
                }
              />
              <Input
                label={t("phone")}
                placeholder={t("phonePlaceholder")}
                value={resumeData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResumeData({ ...resumeData, phone: e.target.value })
                }
              />
              <Input
                label={t("email")}
                placeholder={t("emailPlaceholder")}
                type="email"
                value={resumeData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResumeData({ ...resumeData, email: e.target.value })
                }
              />
              <Input
                label={t("location")}
                placeholder={t("locationPlaceholder")}
                value={resumeData.location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResumeData({ ...resumeData, location: e.target.value })
                }
              />
              <Input
                label={t("linkedin")}
                placeholder={t("linkedinPlaceholder")}
                value={resumeData.linkedin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResumeData({ ...resumeData, linkedin: e.target.value })
                }
              />
              <Input
                label={t("github")}
                placeholder={t("githubPlaceholder")}
                value={resumeData.github}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResumeData({ ...resumeData, github: e.target.value })
                }
              />
              <Input
                label={t("website")}
                placeholder={t("websitePlaceholder")}
                value={resumeData.website}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setResumeData({ ...resumeData, website: e.target.value })
                }
              />
            </div>
          </CardBody>
        </Card>

        {/* Summary */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t("summary")}</h3>
              {isAiOptimizationEnabled && (
                <Tooltip content={t("enhanceSummaryTooltip")}>
                  <Button
                    className={
                      !isSummaryEnhancing
                        ? "text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400"
                        : ""
                    }
                    isLoading={isSummaryEnhancing}
                    size="sm"
                    startContent={!isSummaryEnhancing && <Sparkles size={16} />}
                    variant="light"
                    onPress={handleEnhanceSummary}
                  >
                    {t("enhanceSummary")}
                  </Button>
                </Tooltip>
              )}
            </div>
            <Textarea
              // label={t("summary")}
              minRows={4}
              placeholder={t("summaryPlaceholder")}
              value={resumeData.summary}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setResumeData({ ...resumeData, summary: e.target.value })
              }
            />
          </CardBody>
        </Card>

        {/* Key Skills */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t("keySkills")}</h3>
              <div className="flex items-center gap-2">
                {isAiOptimizationEnabled && (
                  <Tooltip content={t("optimizeSkillGroupsTooltip")}>
                    <Button
                      className={
                        !isSkillSuggesting
                          ? "text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400"
                          : ""
                      }
                      isLoading={isSkillSuggesting}
                      size="sm"
                      startContent={
                        !isSkillSuggesting && <Sparkles size={16} />
                      }
                      variant="light"
                      onPress={handleGetSkillSuggestions}
                    >
                      {t("optimizeSkillGroups")}
                    </Button>
                  </Tooltip>
                )}
                <Button
                  color="primary"
                  size="sm"
                  startContent={<Plus size={18} />}
                  onPress={handleAddSkillGroup}
                >
                  {t("addGroup")}
                </Button>
              </div>
            </div>

            <DndContext
              collisionDetection={closestCenter}
              sensors={sensors}
              onDragEnd={handleGroupDragEnd}
              onDragStart={handleGroupDragStart}
            >
              <SortableContext
                items={(resumeData.keySkills as SkillGroup[]).map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {(resumeData.keySkills as SkillGroup[]).map((group) => (
                    <SortableGroup
                      key={group.id}
                      group={group}
                      onAddSkill={(skill) =>
                        handleAddSkillToGroup(group.id, skill)
                      }
                      onRemove={() => handleRemoveSkillGroup(group.id)}
                      onRemoveSkill={(skillIndex) =>
                        handleRemoveSkillFromGroup(group.id, skillIndex)
                      }
                      onSkillDragEnd={(event) =>
                        handleSkillInGroupDragEnd(group.id, event)
                      }
                      onSkillDragStart={handleSkillInGroupDragStart}
                      onUpdateName={(name) =>
                        handleUpdateGroupName(group.id, name)
                      }
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeGroupId ? (
                  <Card className="bg-default-50 shadow-none border-2 border-dashed border-default-300 opacity-90">
                    <CardBody className="p-4">
                      <div className="font-medium">
                        {
                          (resumeData.keySkills as SkillGroup[]).find(
                            (g) => g.id === activeGroupId,
                          )?.groupName
                        }
                      </div>
                    </CardBody>
                  </Card>
                ) : null}
              </DragOverlay>
            </DndContext>
          </CardBody>
        </Card>

        {/* Work Experience */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t("workExperience")}</h3>
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={18} />}
                onPress={handleAddWorkExperience}
              >
                {t("addExperience")}
              </Button>
            </div>
            {resumeData.workExperience.map((exp, expIndex) => (
              <Card
                key={exp.id}
                className="bg-default-50 shadow-none border-2 border-dashed border-default-300"
              >
                <CardBody className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">
                      {t("experience")} {expIndex + 1}
                    </h4>
                    <Button
                      isIconOnly
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() => handleRemoveWorkExperience(exp.id)}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label={t("company")}
                      placeholder={t("companyPlaceholder")}
                      value={exp.company}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleUpdateWorkExperience(
                          exp.id,
                          "company",
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      label={t("position")}
                      placeholder={t("positionPlaceholder")}
                      value={exp.position}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleUpdateWorkExperience(
                          exp.id,
                          "position",
                          e.target.value,
                        )
                      }
                    />
                    <MonthYearPicker
                      label={t("startDate")}
                      language={
                        (resumeData.preferredLanguage as "en" | "zh") || "en"
                      }
                      maxYear={new Date().getFullYear()}
                      value={normalizeDateString(exp.startDate) || ""}
                      onChange={(value) =>
                        handleUpdateWorkExperience(exp.id, "startDate", value)
                      }
                    />
                    <MonthYearPicker
                      isDisabled={exp.current}
                      label={t("endDate")}
                      language={
                        (resumeData.preferredLanguage as "en" | "zh") || "en"
                      }
                      maxYear={new Date().getFullYear()}
                      value={normalizeDateString(exp.endDate || "") || ""}
                      onChange={(value) =>
                        handleUpdateWorkExperience(exp.id, "endDate", value)
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      checked={exp.current}
                      type="checkbox"
                      onChange={(e) =>
                        handleUpdateWorkExperience(
                          exp.id,
                          "current",
                          e.target.checked,
                        )
                      }
                    />
                    <span className="text-sm">{t("currentPosition")}</span>
                  </label>
                  <Divider />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {t("companyDescription")}
                    </div>
                    <Textarea
                      minRows={2}
                      placeholder={t("companyDescriptionPlaceholder")}
                      value={exp.description || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleUpdateWorkExperience(
                          exp.id,
                          "description",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <Divider />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">
                          {t("responsibilitiesAndAchievements")}
                        </div>
                        {isAiOptimizationEnabled &&
                          exp.responsibilities.length > 0 && (
                            <BatchStarIndicator
                              items={exp.responsibilities.map((resp, idx) => ({
                                id: `${exp.id}-resp-${idx}`,
                                content: resp,
                              }))}
                              onConfirmImprovements={(improvements) => {
                                // 批量更新所有条目，避免状态更新冲突
                                const updates = improvements
                                  .map((improvement) => {
                                    const match =
                                      improvement.id.match(/^(.+)-resp-(\d+)$/);

                                    if (match && match[1] === exp.id) {
                                      return {
                                        index: parseInt(match[2], 10),
                                        value: improvement.improvedContent,
                                      };
                                    }

                                    return null;
                                  })
                                  .filter(
                                    (
                                      update,
                                    ): update is {
                                      index: number;
                                      value: string;
                                    } => update !== null,
                                  );

                                if (updates.length > 0) {
                                  setResumeData((prevData) => ({
                                    ...prevData,
                                    workExperience: prevData.workExperience.map(
                                      (workExp) =>
                                        workExp.id === exp.id
                                          ? {
                                              ...workExp,
                                              responsibilities:
                                                workExp.responsibilities.map(
                                                  (resp, i) => {
                                                    const update = updates.find(
                                                      (u) => u.index === i,
                                                    );

                                                    return update
                                                      ? update.value
                                                      : resp;
                                                  },
                                                ),
                                            }
                                          : workExp,
                                    ),
                                  }));
                                }
                              }}
                            />
                          )}
                      </div>
                      <Button
                        size="sm"
                        startContent={<Plus size={14} />}
                        variant="flat"
                        onPress={() => handleAddResponsibility(exp.id)}
                      >
                        {t("add")}
                      </Button>
                    </div>
                    <DndContext
                      collisionDetection={closestCenter}
                      sensors={sensors}
                      onDragEnd={(event: DragEndEvent) =>
                        handleResponsibilityDragEnd(exp.id, event)
                      }
                    >
                      <SortableContext
                        items={exp.responsibilities.map(
                          (_, i) => `${exp.id}-resp-${i}`,
                        )}
                        strategy={verticalListSortingStrategy}
                      >
                        {exp.responsibilities.map((resp, respIndex) => (
                          <SortableResponsibilityItem
                            key={`${exp.id}-resp-${respIndex}`}
                            expId={exp.id}
                            index={respIndex}
                            responsibility={resp}
                            onRemove={() =>
                              handleRemoveResponsibility(exp.id, respIndex)
                            }
                            onUpdate={(value) =>
                              handleUpdateResponsibility(
                                exp.id,
                                respIndex,
                                value,
                              )
                            }
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>

        {/* Education */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t("education")}</h3>
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={18} />}
                onPress={handleAddEducation}
              >
                {t("addEducation")}
              </Button>
            </div>
            {resumeData.education.map((edu, eduIndex) => (
              <Card
                key={edu.id}
                className="bg-default-50 shadow-none border-2 border-dashed border-default-300"
              >
                <CardBody className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">
                      {t("education")} {eduIndex + 1}
                    </h4>
                    <Button
                      isIconOnly
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() => handleRemoveEducation(edu.id)}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label={t("school")}
                      placeholder={t("schoolPlaceholder")}
                      value={edu.school}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleUpdateEducation(edu.id, "school", e.target.value)
                      }
                    />
                    <Input
                      label={t("degree")}
                      placeholder={t("degreePlaceholder")}
                      value={edu.degree}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleUpdateEducation(edu.id, "degree", e.target.value)
                      }
                    />
                    <Input
                      label={t("major")}
                      placeholder={t("majorPlaceholder")}
                      value={edu.major}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleUpdateEducation(edu.id, "major", e.target.value)
                      }
                    />
                    <Input
                      label={t("gpa")}
                      placeholder={t("gpaPlaceholder")}
                      value={edu.gpa || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleUpdateEducation(edu.id, "gpa", e.target.value)
                      }
                    />
                    <MonthYearPicker
                      label={t("startDate")}
                      language={
                        (resumeData.preferredLanguage as "en" | "zh") || "en"
                      }
                      value={normalizeDateString(edu.startDate) || ""}
                      onChange={(value) =>
                        handleUpdateEducation(edu.id, "startDate", value)
                      }
                    />
                    <MonthYearPicker
                      isDisabled={edu.current}
                      label={t("endDate")}
                      language={
                        (resumeData.preferredLanguage as "en" | "zh") || "en"
                      }
                      value={normalizeDateString(edu.endDate || "") || ""}
                      onChange={(value) =>
                        handleUpdateEducation(edu.id, "endDate", value)
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      checked={edu.current}
                      type="checkbox"
                      onChange={(e) =>
                        handleUpdateEducation(
                          edu.id,
                          "current",
                          e.target.checked,
                        )
                      }
                    />
                    <span className="text-sm">{t("currentlyEnrolled")}</span>
                  </label>
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>

        {/* Projects */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t("projects")}</h3>
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={18} />}
                onPress={handleAddProject}
              >
                {t("addProject")}
              </Button>
            </div>
            {resumeData.projects.map((proj, projIndex) => (
              <Card
                key={proj.id}
                className="bg-default-50 shadow-none border-2 border-dashed border-default-300"
              >
                <CardBody className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">
                      {t("project")} {projIndex + 1}
                    </h4>
                    <Button
                      isIconOnly
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() => handleRemoveProject(proj.id)}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label={t("projectName")}
                      placeholder={t("projectNamePlaceholder")}
                      value={proj.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleUpdateProject(proj.id, "name", e.target.value)
                      }
                    />
                    <Input
                      label={t("role")}
                      placeholder={t("rolePlaceholder")}
                      value={proj.role}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleUpdateProject(proj.id, "role", e.target.value)
                      }
                    />
                    <MonthYearPicker
                      label={t("startDate")}
                      language={
                        (resumeData.preferredLanguage as "en" | "zh") || "en"
                      }
                      maxYear={new Date().getFullYear()}
                      value={normalizeDateString(proj.startDate) || ""}
                      onChange={(value) =>
                        handleUpdateProject(proj.id, "startDate", value)
                      }
                    />
                    <MonthYearPicker
                      isDisabled={proj.current}
                      label={t("endDate")}
                      language={
                        (resumeData.preferredLanguage as "en" | "zh") || "en"
                      }
                      maxYear={new Date().getFullYear()}
                      value={normalizeDateString(proj.endDate || "") || ""}
                      onChange={(value) =>
                        handleUpdateProject(proj.id, "endDate", value)
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      checked={proj.current}
                      type="checkbox"
                      onChange={(e) =>
                        handleUpdateProject(
                          proj.id,
                          "current",
                          e.target.checked,
                        )
                      }
                    />
                    <span className="text-sm">{t("ongoingProject")}</span>
                  </label>
                  <div className="space-y-2">
                    <ProjectStarIndicator
                      content={proj.description}
                      isEnabled={isAiOptimizationEnabled}
                      jobDescription={resumeData.jobDescription}
                      onConfirmImprovement={(improvedContent) =>
                        handleUpdateProject(
                          proj.id,
                          "description",
                          improvedContent,
                        )
                      }
                      onContentChange={(value) =>
                        handleUpdateProject(proj.id, "description", value)
                      }
                    />
                  </div>
                  <Divider />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {t("technologies")}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("addTechnologyPlaceholder")}
                        value={techInputValues[proj.id] || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setTechInputValues({
                            ...techInputValues,
                            [proj.id]: e.target.value,
                          })
                        }
                        onKeyDown={(
                          e: React.KeyboardEvent<HTMLInputElement>,
                        ) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const value = techInputValues[proj.id] || "";

                            if (value.trim()) {
                              handleAddTechnology(proj.id, value);
                              setTechInputValues({
                                ...techInputValues,
                                [proj.id]: "",
                              });
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {proj.technologies.map((tech, techIndex) => (
                        <Chip
                          key={techIndex}
                          endContent={
                            <button
                              className="ml-1"
                              onClick={() =>
                                handleRemoveTechnology(proj.id, techIndex)
                              }
                            >
                              <X size={14} />
                            </button>
                          }
                        >
                          {tech}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg font-semibold">
              {t("additionalInformation")}
            </h3>
            <Textarea
              label={t("additionalInfo")}
              minRows={4}
              placeholder={t("additionalInfoPlaceholder")}
              value={resumeData.additionalInfo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setResumeData({ ...resumeData, additionalInfo: e.target.value })
              }
            />
          </CardBody>
        </Card>
      </div>

      {/* Summary Enhancement Modal */}
      <Modal
        isOpen={isSummaryModalOpen}
        scrollBehavior="inside"
        size="3xl"
        onClose={onSummaryModalClose}
      >
        <ModalContent>
          <ModalHeader>
            <span>{t("enhancedSummaries")}</span>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-sm text-default-600">
                {t("selectSummaryStyle")}
              </p>
              {enhancedSummaries && (
                <div className="space-y-4">
                  {/* Professional */}
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSummary === enhancedSummaries.professional
                        ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                        : "border-default-200 hover:border-default-300"
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setSelectedSummary(enhancedSummaries.professional)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedSummary(enhancedSummaries.professional);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">
                        {t("professionalStyle")}
                      </h4>
                      {selectedSummary === enhancedSummaries.professional && (
                        <CheckCircle className="text-primary" size={18} />
                      )}
                    </div>
                    <Textarea
                      minRows={3}
                      value={
                        selectedSummary === enhancedSummaries.professional
                          ? selectedSummary
                          : enhancedSummaries.professional
                      }
                      onChange={(e) =>
                        selectedSummary === enhancedSummaries.professional &&
                        setSelectedSummary(e.target.value)
                      }
                    />
                  </div>

                  {/* Innovative */}
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSummary === enhancedSummaries.innovative
                        ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                        : "border-default-200 hover:border-default-300"
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setSelectedSummary(enhancedSummaries.innovative)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedSummary(enhancedSummaries.innovative);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{t("innovativeStyle")}</h4>
                      {selectedSummary === enhancedSummaries.innovative && (
                        <CheckCircle className="text-primary" size={18} />
                      )}
                    </div>
                    <Textarea
                      minRows={3}
                      value={
                        selectedSummary === enhancedSummaries.innovative
                          ? selectedSummary
                          : enhancedSummaries.innovative
                      }
                      onChange={(e) =>
                        selectedSummary === enhancedSummaries.innovative &&
                        setSelectedSummary(e.target.value)
                      }
                    />
                  </div>

                  {/* Technical */}
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSummary === enhancedSummaries.technical
                        ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                        : "border-default-200 hover:border-default-300"
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setSelectedSummary(enhancedSummaries.technical)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedSummary(enhancedSummaries.technical);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{t("technicalStyle")}</h4>
                      {selectedSummary === enhancedSummaries.technical && (
                        <CheckCircle className="text-primary" size={18} />
                      )}
                    </div>
                    <Textarea
                      minRows={3}
                      value={
                        selectedSummary === enhancedSummaries.technical
                          ? selectedSummary
                          : enhancedSummaries.technical
                      }
                      onChange={(e) =>
                        selectedSummary === enhancedSummaries.technical &&
                        setSelectedSummary(e.target.value)
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onSummaryModalClose}>
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              onPress={() => {
                setResumeData({ ...resumeData, summary: selectedSummary });
                onSummaryModalClose();
                addToast({
                  title: t("summaryUpdated"),
                  color: "success",
                });
              }}
            >
              {t("apply")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Skill Optimization Modal */}
      <Modal
        isOpen={isSkillModalOpen}
        scrollBehavior="inside"
        size="4xl"
        onClose={onSkillModalClose}
      >
        <ModalContent>
          <ModalHeader>
            <span>{t("optimizedSkillGroups")}</span>
          </ModalHeader>
          <ModalBody>
            {skillOptimization && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="flex gap-4 p-4 bg-default-100 rounded-lg">
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold text-success">
                      +{skillOptimization.changesCount.added}
                    </div>
                    <div className="text-xs text-default-600">
                      {t("skillsAdded")}
                    </div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold text-danger">
                      -{skillOptimization.changesCount.removed}
                    </div>
                    <div className="text-xs text-default-600">
                      {t("skillsRemoved")}
                    </div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {skillOptimization.changesCount.reorganized}
                    </div>
                    <div className="text-xs text-default-600">
                      {t("skillsReorganized")}
                    </div>
                  </div>
                </div>

                {/* AI Reasoning */}
                {skillOptimization.reasoning && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-600" />
                      {t("aiReasoning")}
                    </h4>
                    <p className="text-sm text-default-700">
                      {skillOptimization.reasoning}
                    </p>
                  </div>
                )}

                {/* Optimized Groups Preview */}
                <div>
                  <h4 className="font-semibold mb-3">
                    {t("optimizedGroupsPreview")}
                  </h4>
                  <div className="space-y-3">
                    {skillOptimization.optimizedGroups.map((group, index) => (
                      <Card key={index} className="border border-default-200">
                        <CardBody className="p-4">
                          <div className="font-semibold text-sm mb-2 text-primary">
                            {group.groupName}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {group.skills.map((skill, skillIndex) => (
                              <Chip
                                key={skillIndex}
                                color="primary"
                                size="sm"
                                variant="flat"
                              >
                                {skill}
                              </Chip>
                            ))}
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                <div className="p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800">
                  <p className="text-sm text-warning-700 dark:text-warning-300">
                    ⚠️ {t("applyOptimizationWarning")}
                  </p>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onSkillModalClose}>
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              onPress={() => {
                if (skillOptimization) {
                  setResumeData({
                    ...resumeData,
                    keySkills: skillOptimization.optimizedGroups,
                  });
                  onSkillModalClose();
                  addToast({
                    title: t("skillGroupsUpdated"),
                    color: "success",
                  });
                }
              }}
            >
              {t("applyToResume")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Preview Modal */}
      <ResumePreviewModal
        isOpen={isOpen}
        resumeData={resumeData}
        resumeId={Number(resolvedParams.id)}
        onClose={onClose}
        onThemeColorChange={(color) =>
          setResumeData({ ...resumeData, themeColor: color })
        }
      />
    </div>
  );
}
