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
        className="flex flex-col items-center justify-center gap-6 text-center w-full px-6 min-h-[calc(100vh-9rem)] bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-indigo-950/50 dark:to-slate-900 rounded-3xl"
        initial="hidden"
        variants={containerVariants}
      >
        <MotionDiv className="inline-block" variants={itemVariants}>
          <h1 className={title({ size: "lg" })}>
            Create Your Professional Resume,&nbsp;
            <span className={title({ color: "blue", size: "lg" })}>
              Start Here
            </span>
          </h1>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <p className={subtitle({ class: "mt-4" })}>
            Easily create, manage, and export your professional resume.
            <br />
            Modern design, one-click PDF export, helping you stand out in your
            job search.
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
              Create Resume
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
