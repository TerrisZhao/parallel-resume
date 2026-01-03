"use client";

import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { motion } from "framer-motion";
import { FileText, Gift } from "lucide-react";
import { useTranslations } from "next-intl";

import { title, subtitle } from "@/components/primitives";

const MotionDiv = motion.div;

export default function Home() {
  const t = useTranslations("home");
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gradient-to-br from-rose-400 via-fuchsia-500/50 to-indigo-500 dark:from-rose-400 dark:via-fuchsia-500/50 dark:to-indigo-500 p-8 sm:p-10 lg:p-16">
      <div className="h-12" />
      {/* Hero Section */}
      <MotionDiv
        animate="visible"
        className="flex flex-col items-center min-h-[calc(100vh-12rem)] justify-center gap-8 text-center w-full p-8 bg-background/70 backdrop-blur-lg backdrop-saturate-150 rounded-3xl"
        initial="hidden"
        variants={containerVariants}
      >
        <MotionDiv className="inline-block" variants={itemVariants}>
          <h1 className={title({ size: "lg" })}>
            {t("title")}&nbsp;
            <span className={title({ color: "blue", size: "lg" })}>
              {t("titleHighlight")}
            </span>
          </h1>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <p className={subtitle({ class: "mt-4" })}>
            {t("subtitle")
              .split("\n")
              .map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
          </p>
        </MotionDiv>

        {/* 新用户推广 */}
        <MotionDiv variants={itemVariants} className="w-full max-w-md">
          <Card className="bg-gradient-to-r from-primary-500 to-secondary-500 border-none shadow-lg">
            <CardBody className="flex flex-row items-center gap-3 p-4">
              <div className="flex-shrink-0">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">
                  {t("promoTitle")}
                </p>
                <p className="text-white/90 text-xs">
                  {t("promoDescription")}
                </p>
              </div>
            </CardBody>
          </Card>
        </MotionDiv>

        <MotionDiv className="flex gap-4 mt-4" variants={itemVariants}>
          <Link href="/resume">
            <Button
              className="px-10 font-semibold shadow-md"
              color="primary"
              radius="full"
              size="lg"
              startContent={<FileText size={20} />}
              variant="shadow"
            >
              {t("getStarted")}
            </Button>
          </Link>
        </MotionDiv>
      </MotionDiv>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 w-full flex items-center justify-center py-3 z-40">
        <Link
          isExternal
          className="flex items-center gap-1 text-current"
          href="#"
          title="Resume Builder"
        >
          <span className="text-default-600">2025 ｜ {t("footer")} Terris</span>
        </Link>
      </footer>
    </div>
  );
}
