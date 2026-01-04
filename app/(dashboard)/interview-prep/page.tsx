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
import { addToast } from "@heroui/toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Icon } from "@iconify/react";

import { usePageHeader } from "../use-page-header";

import { Loading } from "@/components/loading";

interface PreparationMaterial {
  id: number;
  title: string;
  category: string;
  content: string;
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
  });

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
    });
    onOpen();
  };

  const handleEdit = (material: PreparationMaterial) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      content: material.content,
      category: material.category,
    });
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
    return materials.filter((m) => m.category === category);
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
      <Tabs
        className={"justify-center"}
        selectedKey={selectedCategory}
        onSelectionChange={(key) => setSelectedCategory(key as string)}
      >
        {CATEGORIES.map((category) => (
          <Tab key={category} title={t(`categories.${category}`)}>
            <div className="mt-4 space-y-4">
              {getMaterialsByCategory(category).length === 0 ? (
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
                getMaterialsByCategory(category).map((material) => (
                  <Card key={material.id}>
                    <CardHeader className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">
                        {material.title}
                      </h3>
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
          </Tab>
        ))}
      </Tabs>

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
