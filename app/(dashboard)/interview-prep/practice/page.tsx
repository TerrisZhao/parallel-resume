"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { addToast } from "@heroui/toast";
import { X, ChevronRight, Languages, Play, Pause } from "lucide-react";

import { Loading } from "@/components/loading";
import { MeshGradient } from "@/components/mesh-gradient";

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

export default function PracticePage() {
  const t = useTranslations("interviewPrep");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [materials, setMaterials] = useState<PreparationMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const category = searchParams.get("category") || "all";
  const tagFilter = searchParams.get("tag");

  useEffect(() => {
    void fetchMaterials();
  }, []);

  useEffect(() => {
    // 清理音频
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, [audio]);

  // 当切换资料时，重置状态
  useEffect(() => {
    setShowTranslation(false);
    setIsPlaying(false);
    if (audio) {
      audio.pause();
      setAudio(null);
    }
  }, [currentIndex]);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/interview-preparations");

      if (response.ok) {
        const data = await response.json();
        const allMaterials = data.materials || [];

        // 根据URL参数过滤资料
        const filtered = allMaterials.filter((m: PreparationMaterial) => {
          if (category !== "all" && m.category !== category) return false;

          if (tagFilter) {
            const tags = m.tags && Array.isArray(m.tags) ? m.tags : [];

            return tags.includes(tagFilter);
          }

          return true;
        });

        setMaterials(filtered);

        if (filtered.length === 0) {
          addToast({
            title: t("noMaterialsToPractice"),
            color: "warning",
          });
          router.push("/interview-prep");
        }
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
      addToast({
        title: t("failedToLoad"),
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    router.push("/interview-prep");
  };

  const handleNext = () => {
    if (currentIndex < materials.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 循环到第一个
      setCurrentIndex(0);
    }
  };

  const toggleTranslation = () => {
    setShowTranslation(!showTranslation);
  };

  const toggleAudioPlayback = () => {
    const currentMaterial = materials[currentIndex];

    if (!currentMaterial?.audioUrl) return;

    if (isPlaying) {
      audio?.pause();
      setIsPlaying(false);
    } else {
      let audioElement = audio;

      if (!audioElement) {
        audioElement = new Audio(currentMaterial.audioUrl);
        audioElement.addEventListener("ended", () => {
          setIsPlaying(false);
        });
        audioElement.addEventListener("error", (e) => {
          console.error("Audio playback error:", e);
          addToast({
            title: t("audioPlaybackError"),
            color: "danger",
          });
          setIsPlaying(false);
        });
        setAudio(audioElement);
      }
      audioElement.play();
      setIsPlaying(true);
    }
  };

  if (isLoading) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-white dark:bg-zinc-950">
        <MeshGradient />
        <div className="relative z-10">
          <Loading />
        </div>
      </div>
    );
  }

  if (materials.length === 0) {
    return null;
  }

  const currentMaterial = materials[currentIndex];

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-white dark:bg-zinc-950">
      {/* 动画背景 */}
      <MeshGradient />

      {/* 顶部工具栏 */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-divider backdrop-blur-lg bg-background/50">
        <Button
          isIconOnly
          size="lg"
          variant="light"
          onPress={handleClose}
        >
          <X size={24} />
        </Button>
        <div className="text-sm text-white-500">
          {currentIndex + 1} / {materials.length}
        </div>
        <Button
          isIconOnly
          size="lg"
          variant="light"
          onPress={handleNext}
        >
          <ChevronRight size={24} />
        </Button>
      </div>

      {/* 主内容区域 */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 py-6 sm:p-8 overflow-auto">
        <div className="w-full max-w-4xl">
          <Card className="border-none shadow-lg bg-background/80 backdrop-blur-lg backdrop-saturate-150">
            <CardHeader className="flex justify-between items-center p-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-semibold">{currentMaterial.title}</h3>
                {currentMaterial.tags && currentMaterial.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {currentMaterial.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-default-100/80 backdrop-blur-sm px-3 py-1 text-sm text-default-700 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {currentMaterial.audioUrl && (
                  <Button
                    isIconOnly
                    color={isPlaying ? "primary" : "default"}
                    size="lg"
                    variant={isPlaying ? "flat" : "light"}
                    onPress={toggleAudioPlayback}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </Button>
                )}
                {currentMaterial.translation && (
                  <Button
                    isIconOnly
                    color={showTranslation ? "primary" : "default"}
                    size="lg"
                    variant={showTranslation ? "flat" : "light"}
                    onPress={toggleTranslation}
                  >
                    <Languages size={20} />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <p className="text-lg whitespace-pre-wrap leading-relaxed">
                {currentMaterial.content}
              </p>
              {showTranslation && currentMaterial.translation && (
                <div className="mt-6 pt-6 border-t border-divider">
                  <p className="text-sm text-default-500 mb-3 font-medium">
                    {t("translation")}:
                  </p>
                  <p className="text-lg whitespace-pre-wrap leading-relaxed text-default-600">
                    {currentMaterial.translation}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
