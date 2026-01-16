"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Tabs, Tab } from "@heroui/tabs";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { addToast } from "@heroui/toast";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Sparkles,
  Languages,
  Play,
  Pause,
} from "lucide-react";
import { Icon } from "@iconify/react";

import { usePageHeader } from "../use-page-header";

import { Loading } from "@/components/loading";

interface PreparationMaterial {
  id: number;
  title: string;
  category: string;
  content: string;
  translation?: string | null;
  audioUrl?: string | null;
  tags?: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["all", "self_intro", "project", "work", "qa"];

export default function InterviewPrepPage() {
  const t = useTranslations("interviewPrep");
  const tCommon = useTranslations("common");
  const { setHeader } = usePageHeader();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [materials, setMaterials] = useState<PreparationMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingMaterial, setEditingMaterial] =
    useState<PreparationMaterial | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const [deletingMaterial, setDeletingMaterial] =
    useState<PreparationMaterial | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "self_intro",
    tags: [] as string[],
  });

  const [tagInputValue, setTagInputValue] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null,
  );
  // 跟踪哪些 material 显示翻译
  const [showTranslationMap, setShowTranslationMap] = useState<
    Record<number, boolean>
  >({});
  // 跟踪哪些 material 正在播放音频
  const [playingAudioMap, setPlayingAudioMap] = useState<
    Record<number, boolean>
  >({});
  // 存储audio元素引用
  const [audioElements, setAudioElements] = useState<
    Record<number, HTMLAudioElement>
  >({});

  // AI生成相关状态
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const [works, setWorks] = useState<
    Array<{ id: number; name: string; company: string; position: string }>
  >([]);

  const allTags = Array.from(
    new Set(
      materials.flatMap((m) => (m.tags && Array.isArray(m.tags) ? m.tags : [])),
    ),
  );

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
          {t("addMaterial")}
        </Button>
      </div>,
    );

    return () => setHeader(null);
  }, [setHeader, t]);

  // Fetch materials
  useEffect(() => {
    void fetchMaterials();
    void fetchResumes();
  }, []);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/interview-preparations");

      if (response.ok) {
        const data = await response.json();

        setMaterials(data.materials || []);
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const response = await fetch("/api/resumes");

      if (response.ok) {
        const data = await response.json();

        setResumes(data.resumes || []);
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  // 当选择简历时，获取该简历的项目和工作经历
  useEffect(() => {
    const fetchResumeDetails = async () => {
      if (!selectedResumeId) {
        setProjects([]);
        setWorks([]);
        setSelectedItemId(null);

        return;
      }

      try {
        const response = await fetch(`/api/resumes/${selectedResumeId}`);

        if (response.ok) {
          const { resume } = await response.json();

          // 设置项目列表
          const projectList: Array<{ id: number; name: string }> = [];

          if (resume.projects && resume.projects.length > 0) {
            resume.projects.forEach((project: any) => {
              projectList.push({
                id: parseInt(project.id),
                name: project.name,
              });
            });
          }
          setProjects(projectList);

          // 设置工作经历列表
          const workList: Array<{
            id: number;
            name: string;
            company: string;
            position: string;
          }> = [];

          if (resume.workExperience && resume.workExperience.length > 0) {
            resume.workExperience.forEach((work: any) => {
              workList.push({
                id: parseInt(work.id),
                name: work.company,
                company: work.company,
                position: work.position,
              });
            });
          }
          setWorks(workList);

          setSelectedItemId(null);
        }
      } catch (error) {
        console.error("Error fetching resume details:", error);
      }
    };

    void fetchResumeDetails();
  }, [selectedResumeId, t]);

  const handleAddNew = () => {
    setEditingMaterial(null);
    setFormData({
      title: "",
      content: "",
      category: selectedCategory === "all" ? "self_intro" : selectedCategory,
      tags: [],
    });
    setTagInputValue("");
    setSelectedResumeId(null);
    setSelectedItemId(null);
    onOpen();
  };

  const handleEdit = (material: PreparationMaterial) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      content: material.content,
      category: material.category,
      tags: material.tags ?? [],
    });
    setTagInputValue("");
    setSelectedResumeId(null);
    setSelectedItemId(null);
    onOpen();
  };

  const handleDelete = (material: PreparationMaterial) => {
    setDeletingMaterial(material);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!deletingMaterial) return;

    try {
      const response = await fetch(
        `/api/interview-preparations/${deletingMaterial.id}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        addToast({
          title: t("deletedSuccess"),
          color: "success",
        });
        await fetchMaterials();
        onDeleteClose();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting material:", error);
      addToast({
        title: t("failedToDelete"),
        color: "danger",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      addToast({
        title: tCommon("fillRequired"),
        color: "danger",
      });

      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        tags: formData.tags,
      };

      const response = editingMaterial
        ? await fetch(`/api/interview-preparations/${editingMaterial.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/interview-preparations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (response.ok) {
        addToast({
          title: editingMaterial ? t("updatedSuccess") : t("createdSuccess"),
          color: "success",
        });
        await fetchMaterials();
        onClose();
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving material:", error);
      addToast({
        title: editingMaterial ? t("failedToUpdate") : t("failedToCreate"),
        color: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getMaterialsByCategory = (category: string) => {
    return materials.filter((m) => {
      // "all" 显示所有分类
      if (category !== "all" && m.category !== category) return false;

      if (!selectedTagFilter) return true;

      const tags = m.tags && Array.isArray(m.tags) ? m.tags : [];

      return tags.includes(selectedTagFilter);
    });
  };

  const toggleTranslation = (materialId: number) => {
    setShowTranslationMap((prev) => ({
      ...prev,
      [materialId]: !prev[materialId],
    }));
  };

  const toggleAudioPlayback = (materialId: number, audioUrl: string) => {
    const isPlaying = playingAudioMap[materialId];

    if (isPlaying) {
      // 暂停播放
      const audio = audioElements[materialId];

      if (audio) {
        audio.pause();
      }
      setPlayingAudioMap((prev) => ({
        ...prev,
        [materialId]: false,
      }));
    } else {
      // 开始播放
      let audio = audioElements[materialId];

      if (!audio) {
        audio = new Audio(audioUrl);
        audio.addEventListener("ended", () => {
          setPlayingAudioMap((prev) => ({
            ...prev,
            [materialId]: false,
          }));
        });
        audio.addEventListener("error", (e) => {
          console.error("Audio playback error:", e);
          addToast({
            title: t("audioPlaybackError"),
            color: "danger",
          });
          setPlayingAudioMap((prev) => ({
            ...prev,
            [materialId]: false,
          }));
        });
        setAudioElements((prev) => ({
          ...prev,
          [materialId]: audio!,
        }));
      }
      audio.play();
      setPlayingAudioMap((prev) => ({
        ...prev,
        [materialId]: true,
      }));
    }
  };

  const handleGenerateWithAI = async () => {
    // 验证
    if (!formData.title.trim()) {
      addToast({
        title: t("fillTitleFirst"),
        color: "warning",
      });

      return;
    }

    if (!selectedResumeId) {
      addToast({
        title: t("selectResumeFirst"),
        color: "warning",
      });

      return;
    }

    // 如果是项目或工作经历类别，需要选择具体项目或工作
    if (
      (formData.category === "project" || formData.category === "work") &&
      !selectedItemId
    ) {
      addToast({
        title: t("selectProjectOrWork"),
        color: "warning",
      });

      return;
    }

    setIsGenerating(true);
    try {
      const payload: any = {
        resumeId: selectedResumeId,
        title: formData.title,
        category: formData.category,
      };

      // 只在需要时添加itemId
      if (selectedItemId !== null) {
        payload.itemId = selectedItemId;
      }

      const response = await fetch("/api/ai/generate-interview-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();

        setFormData({ ...formData, content: data.content });
        addToast({
          title: t("generateSuccess"),
          color: "success",
        });
      } else {
        const errorData = await response.json();

        console.error("API error:", errorData);

        // 如果是项目/工作不存在，清空选择并提示用户重新选择
        if (
          errorData.error?.includes("not found") &&
          (formData.category === "project" || formData.category === "work")
        ) {
          addToast({
            title: t("selectedItemNoLongerExists"),
            color: "warning",
          });

          // 重新获取简历详情以更新项目列表
          const resumeResponse = await fetch(
            `/api/resumes/${selectedResumeId}`,
          );

          if (resumeResponse.ok) {
            const { resume } = await resumeResponse.json();

            // 更新项目列表
            const projectList: Array<{ id: number; name: string }> = [];

            if (resume.projects && resume.projects.length > 0) {
              resume.projects.forEach((project: any) => {
                projectList.push({
                  id: parseInt(project.id),
                  name: project.name,
                });
              });
            }
            setProjects(projectList);

            // 更新工作经历列表
            const workList: Array<{
              id: number;
              name: string;
              company: string;
              position: string;
            }> = [];

            if (resume.workExperience && resume.workExperience.length > 0) {
              resume.workExperience.forEach((work: any) => {
                workList.push({
                  id: parseInt(work.id),
                  name: work.company,
                  company: work.company,
                  position: work.position,
                });
              });
            }
            setWorks(workList);

            setSelectedItemId(null);
          }
        } else {
          throw new Error(
            errorData.error || errorData.details || "Failed to generate",
          );
        }
      }
    } catch (error) {
      console.error("Error generating material:", error);
      addToast({
        title: t("generateFailed"),
        color: "danger",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  const handleStartPractice = () => {
    const filteredMaterials = getMaterialsByCategory(selectedCategory);

    if (filteredMaterials.length === 0) {
      addToast({
        title: t("noMaterialsToPractice"),
        color: "warning",
      });

      return;
    }

    // 构建URL参数
    const params = new URLSearchParams();

    params.set("category", selectedCategory);
    if (selectedTagFilter) {
      params.set("tag", selectedTagFilter);
    }

    window.location.href = `/interview-prep/practice?${params.toString()}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex items-center justify-center mb-4">
        {/* 开始练习按钮 - 左侧 */}
        <div className="absolute left-0">
          {getMaterialsByCategory(selectedCategory).length > 0 && (
            <Button
              color="primary"
              size="sm"
              startContent={<Play size={16} />}
              variant="flat"
              onPress={handleStartPractice}
            >
              {t("startPractice")}
            </Button>
          )}
        </div>

        {/* Tabs - 中间 */}
        <Tabs
          color="primary"
          radius="full"
          selectedKey={selectedCategory}
          onSelectionChange={(key) => setSelectedCategory(key as string)}
        >
          {CATEGORIES.map((category) => (
            <Tab key={category} title={t(`categories.${category}`)} />
          ))}
        </Tabs>

        {/* Filter - 右侧 */}
        <div className="absolute right-0">
          {allTags.length > 0 && (
            <Select
              aria-label={t("tagFilter")}
              className="w-80"
              placeholder={t("tagFilterPlaceholder")}
              selectedKeys={selectedTagFilter ? [selectedTagFilter] : []}
              selectionMode="single"
              size="sm"
              onSelectionChange={(keys) => {
                const keyArr = Array.from(keys);
                const value = (keyArr[0] as string | undefined) ?? null;

                setSelectedTagFilter(value);
              }}
            >
              {allTags.map((tag) => (
                <SelectItem key={tag}>{tag}</SelectItem>
              ))}
            </Select>
          )}
        </div>
      </div>
      <div className="space-y-4 pb-6">
        {getMaterialsByCategory(selectedCategory).length === 0 ? (
          <Card className="border-none shadow-none">
            <CardBody className="text-center py-12">
              <Icon
                className="mx-auto mb-4 text-default-400"
                icon={"solar:clipboard-list-bold-duotone"}
                width={128}
              />
              <h3 className="text-xl font-semibold mb-2">{t("noMaterials")}</h3>
              <p className="text-default-500 mb-4">
                {t("noMaterialsDescription")}
              </p>
            </CardBody>
          </Card>
        ) : (
          getMaterialsByCategory(selectedCategory).map((material) => (
            <Card
              key={material.id}
              className="border-none shadow-none bg-default-100"
            >
              <CardHeader className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">{material.title}</h3>
                  {material.tags && material.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {material.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white px-2 py-0.5 text-xs text-default-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {material.audioUrl && (
                    <Button
                      isIconOnly
                      color={
                        playingAudioMap[material.id] ? "primary" : "default"
                      }
                      size="sm"
                      variant={playingAudioMap[material.id] ? "flat" : "light"}
                      onPress={() =>
                        toggleAudioPlayback(material.id, material.audioUrl!)
                      }
                    >
                      {playingAudioMap[material.id] ? (
                        <Pause size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                    </Button>
                  )}
                  {material.translation && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => toggleTranslation(material.id)}
                    >
                      <Languages size={16} />
                    </Button>
                  )}
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => handleEdit(material)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    isIconOnly
                    color="danger"
                    size="sm"
                    variant="light"
                    onPress={() => handleDelete(material)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap">{material.content}</p>
                {showTranslationMap[material.id] && material.translation && (
                  <div className="mt-4 pt-4 border-t border-divider">
                    <p className="text-sm text-default-500 mb-2 font-medium">
                      {t("translation")}:
                    </p>
                    <p className="whitespace-pre-wrap text-default-600">
                      {material.translation}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} size="2xl" onOpenChange={onClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingMaterial ? t("editMaterial") : t("addMaterial")}
              </ModalHeader>
              <ModalBody className="gap-4">
                <Input
                  isRequired
                  label={t("materialTitle")}
                  placeholder={t("materialTitlePlaceholder")}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                <Select
                  isRequired
                  label={t("category")}
                  selectedKeys={[formData.category]}
                  onSelectionChange={(keys) => {
                    const newCategory = Array.from(keys)[0] as string;
                    const oldCategory = formData.category;

                    setFormData({
                      ...formData,
                      category: newCategory,
                    });
                    // 切换category时清空selectedItemId，因为不同分类对应不同的数据列表
                    if (oldCategory !== newCategory) {
                      setSelectedItemId(null);
                    }
                  }}
                >
                  {CATEGORIES.filter((cat) => cat !== "all").map((category) => (
                    <SelectItem key={category}>
                      {t(`categories.${category}`)}
                    </SelectItem>
                  ))}
                </Select>
                {/* 标签选择与新增 */}
                <div className="flex flex-col gap-2">
                  <Autocomplete
                    allowsCustomValue
                    inputValue={tagInputValue}
                    items={(() => {
                      const searchLower = tagInputValue.toLowerCase().trim();
                      // 过滤未选择的标签
                      const availableTags = allTags.filter(
                        (tag) => !formData.tags.includes(tag),
                      );
                      // 根据搜索过滤
                      const filteredTags = searchLower
                        ? availableTags.filter((tag) =>
                            tag.toLowerCase().includes(searchLower),
                          )
                        : availableTags;
                      // 检查是否需要显示创建选项
                      const trimmedInput = tagInputValue.trim();
                      const shouldShowCreate =
                        trimmedInput &&
                        !allTags.includes(trimmedInput) &&
                        !formData.tags.includes(trimmedInput);

                      const items: {
                        key: string;
                        label: string;
                        isCreate?: boolean;
                      }[] = filteredTags.map((tag) => ({
                        key: tag,
                        label: tag,
                      }));

                      if (shouldShowCreate) {
                        items.push({
                          key: `__create__:${trimmedInput}`,
                          label: `${t("createTag")}: ${trimmedInput}`,
                          isCreate: true,
                        });
                      }

                      return items;
                    })()}
                    label={t("tags")}
                    placeholder={t("tagsPlaceholder")}
                    onInputChange={setTagInputValue}
                    onSelectionChange={(key) => {
                      if (key === null) return;
                      const tag = String(key);

                      // 处理创建新标签
                      if (tag.startsWith("__create__:")) {
                        const newTag = tag.replace("__create__:", "");

                        if (newTag && !formData.tags.includes(newTag)) {
                          setFormData({
                            ...formData,
                            tags: [...formData.tags, newTag],
                          });
                        }
                      } else if (!formData.tags.includes(tag)) {
                        setFormData({
                          ...formData,
                          tags: [...formData.tags, tag],
                        });
                      }
                      setTagInputValue("");
                    }}
                  >
                    {(item) => (
                      <AutocompleteItem
                        key={item.key}
                        className={
                          item.isCreate ? "text-primary font-medium" : ""
                        }
                      >
                        {item.label}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>
                  {/* 已选标签预览 */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <div
                          key={tag}
                          className="flex items-center gap-1 rounded-full bg-default-100 px-3 py-1 text-sm text-default-700"
                        >
                          <span>{tag}</span>
                          <button
                            className="ml-1 hover:bg-default-200 rounded-full p-0.5 transition-colors"
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                tags: formData.tags.filter((t) => t !== tag),
                              });
                            }}
                          >
                            <X className="text-default-500" size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Textarea
                  isRequired
                  label={t("content")}
                  minRows={10}
                  placeholder={t("contentPlaceholder")}
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                />
                <div className="flex items-center gap-2">
                  <Select
                    className="w-48"
                    label={t("selectResumePlaceholder")}
                    placeholder={t("selectResumePlaceholder")}
                    selectedKeys={
                      selectedResumeId ? [selectedResumeId.toString()] : []
                    }
                    selectionMode="single"
                    size="sm"
                    onSelectionChange={(keys) => {
                      const key = Array.from(keys)[0] as string | undefined;

                      setSelectedResumeId(key ? parseInt(key) : null);
                    }}
                  >
                    {resumes.length === 0 ? (
                      <SelectItem key="no-resume" isDisabled>
                        {t("noResumeAvailable")}
                      </SelectItem>
                    ) : (
                      resumes.map((resume) => (
                        <SelectItem
                          key={resume.id.toString()}
                          textValue={resume.name}
                        >
                          {resume.name}
                        </SelectItem>
                      ))
                    )}
                  </Select>
                  {formData.category === "project" && (
                    <Select
                      className="w-64"
                      isDisabled={!selectedResumeId}
                      label={t("selectProjectPlaceholder")}
                      placeholder={t("selectProjectPlaceholder")}
                      selectedKeys={
                        selectedItemId ? [selectedItemId.toString()] : []
                      }
                      selectionMode="single"
                      size="sm"
                      onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0] as string | undefined;

                        setSelectedItemId(key ? parseInt(key) : null);
                      }}
                    >
                      {projects.length === 0 ? (
                        <SelectItem key="no-project" isDisabled>
                          {t("noProjectAvailable")}
                        </SelectItem>
                      ) : (
                        projects.map((project) => (
                          <SelectItem
                            key={project.id.toString()}
                            textValue={project.name}
                          >
                            {project.name}
                          </SelectItem>
                        ))
                      )}
                    </Select>
                  )}
                  {formData.category === "work" && (
                    <Select
                      className="w-64"
                      isDisabled={!selectedResumeId}
                      label={t("selectWorkPlaceholder")}
                      placeholder={t("selectWorkPlaceholder")}
                      selectedKeys={
                        selectedItemId ? [selectedItemId.toString()] : []
                      }
                      selectionMode="single"
                      size="sm"
                      onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0] as string | undefined;

                        setSelectedItemId(key ? parseInt(key) : null);
                      }}
                    >
                      {works.length === 0 ? (
                        <SelectItem key="no-work" isDisabled>
                          {t("noWorkAvailable")}
                        </SelectItem>
                      ) : (
                        works.map((work) => (
                          <SelectItem
                            key={work.id.toString()}
                            textValue={`${work.company} - ${work.position}`}
                          >
                            {work.company} - {work.position}
                          </SelectItem>
                        ))
                      )}
                    </Select>
                  )}
                  <Button
                    color="secondary"
                    isDisabled={!selectedResumeId || isGenerating}
                    isLoading={isGenerating}
                    size="lg"
                    startContent={!isGenerating && <Sparkles size={16} />}
                    variant="flat"
                    onPress={handleGenerateWithAI}
                  >
                    {isGenerating ? t("generating") : t("generateWithAI")}
                  </Button>
                </div>
              </ModalBody>
              <ModalFooter className="justify-end">
                <div className="flex gap-2">
                  <Button variant="flat" onPress={onClose}>
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    color="primary"
                    isDisabled={
                      !formData.title.trim() || !formData.content.trim()
                    }
                    isLoading={isSaving}
                    onPress={handleSave}
                  >
                    {tCommon("save")}
                  </Button>
                </div>
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
              <ModalHeader>{t("deleteMaterial")}</ModalHeader>
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
