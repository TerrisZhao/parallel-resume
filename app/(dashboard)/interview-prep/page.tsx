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
import { Plus, Edit, Trash2, X } from "lucide-react";
import { Icon } from "@iconify/react";

import { usePageHeader } from "../use-page-header";

import { Loading } from "@/components/loading";

interface PreparationMaterial {
  id: number;
  title: string;
  category: string;
  content: string;
  tags?: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["self_intro", "project", "work", "qa"];

export default function InterviewPrepPage() {
  const t = useTranslations("interviewPrep");
  const tCommon = useTranslations("common");
  const { setHeader } = usePageHeader();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [materials, setMaterials] = useState<PreparationMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("self_intro");
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

  const handleAddNew = () => {
    setEditingMaterial(null);
    setFormData({
      title: "",
      content: "",
      category: selectedCategory,
      tags: [],
    });
    setTagInputValue("");
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
      if (m.category !== category) return false;

      if (!selectedTagFilter) return true;

      const tags = m.tags && Array.isArray(m.tags) ? m.tags : [];

      return tags.includes(selectedTagFilter);
    });
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
      <div className="relative flex items-center justify-center mb-4">
        <Tabs
          selectedKey={selectedCategory}
          onSelectionChange={(key) => setSelectedCategory(key as string)}
        >
          {CATEGORIES.map((category) => (
            <Tab key={category} title={t(`categories.${category}`)} />
          ))}
        </Tabs>
        {allTags.length > 0 && (
          <Select
            className="absolute right-0 w-80"
            size="sm"
            selectedKeys={selectedTagFilter ? [selectedTagFilter] : []}
            selectionMode="single"
            onSelectionChange={(keys) => {
              const keyArr = Array.from(keys);
              const value = (keyArr[0] as string | undefined) ?? null;

              setSelectedTagFilter(value);
            }}
            placeholder={t("tagFilterPlaceholder")}
            aria-label={t("tagFilter")}
          >
            {allTags.map((tag) => (
              <SelectItem key={tag}>{tag}</SelectItem>
            ))}
          </Select>
        )}
      </div>
      <div className="space-y-4">
        {getMaterialsByCategory(selectedCategory).length === 0 ? (
          <Card className="border-none shadow-none">
            <CardBody className="text-center py-12">
              <Icon
                className="mx-auto mb-4 text-default-400"
                icon={"solar:clipboard-list-bold-duotone"}
                width={128}
              />
              <h3 className="text-xl font-semibold mb-2">
                {t("noMaterials")}
              </h3>
              <p className="text-default-500 mb-4">
                {t("noMaterialsDescription")}
              </p>
            </CardBody>
          </Card>
        ) : (
          getMaterialsByCategory(selectedCategory).map((material) => (
            <Card key={material.id}>
              <CardHeader className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">{material.title}</h3>
                  {material.tags && material.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {material.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-default-100 px-2 py-0.5 text-xs text-default-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
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
                  onSelectionChange={(keys) =>
                    setFormData({
                      ...formData,
                      category: Array.from(keys)[0] as string,
                    })
                  }
                >
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category}>
                      {t(`categories.${category}`)}
                    </SelectItem>
                  ))}
                </Select>
                {/* 标签选择与新增 */}
                <div className="flex flex-col gap-2">
                  <Autocomplete
                    label={t("tags")}
                    placeholder={t("tagsPlaceholder")}
                    inputValue={tagInputValue}
                    onInputChange={setTagInputValue}
                    allowsCustomValue
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

                      const items: { key: string; label: string; isCreate?: boolean }[] = 
                        filteredTags.map((tag) => ({
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
                        className={item.isCreate ? "text-primary font-medium" : ""}
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
                            type="button"
                            className="ml-1 hover:bg-default-200 rounded-full p-0.5 transition-colors"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                tags: formData.tags.filter((t) => t !== tag),
                              });
                            }}
                          >
                            <X size={14} className="text-default-500" />
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
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  {tCommon("cancel")}
                </Button>
                <Button
                  color="primary"
                  isLoading={isSaving}
                  onPress={handleSave}
                >
                  {tCommon("save")}
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
