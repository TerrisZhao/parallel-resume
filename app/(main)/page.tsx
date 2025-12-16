"use client";

import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

import { title, subtitle } from "@/components/primitives";

const MotionDiv = motion.div;

export default function Home() {
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
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <MotionDiv
        animate="visible"
        className="flex flex-col items-center justify-center gap-6 text-center w-full px-6 min-h-[calc(100vh-9rem)] bg-gradient-to-br from-blue-200 via-purple-200 to-blue-100 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-blue-950/20 rounded-3xl"
        initial="hidden"
        variants={containerVariants}
      >
        <MotionDiv className="inline-block" variants={itemVariants}>
          <h1 className={title({ size: "lg" })}>
            打造专业简历，从&nbsp;
            <span className={title({ color: "blue", size: "lg" })}>这里</span>
            &nbsp;开始
          </h1>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <p className={subtitle({ class: "mt-4" })}>
            轻松创建、管理和导出你的专业简历。
            <br />
            现代化设计、一键导出PDF，助你在求职中脱颖而出。
          </p>
        </MotionDiv>

        <MotionDiv className="flex gap-4 mt-4" variants={itemVariants}>
          <Link href="/resume">
            <Button
              className="font-semibold"
              color="primary"
              radius="full"
              size="lg"
              startContent={<FileText size={20} />}
            >
              开始创建简历
            </Button>
          </Link>
        </MotionDiv>
      </MotionDiv>

      {/* Footer */}
      <footer className="w-full flex items-center justify-center py-3">
        <Link
          isExternal
          className="flex items-center gap-1 text-current"
          href="#"
          title="Resume Builder"
        >
          <span className="text-default-600">2025 ｜ Designed by</span>
          <p className="text-primary">Terris</p>
        </Link>
      </footer>
    </div>
  );
}
