"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Chrome,
  Download,
  Zap,
  Shield,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

import { title, subtitle } from "@/components/primitives";

const MotionDiv = motion.div;
const MotionCard = motion(Card);

export default function ChromeExtensionPage() {
  const t = useTranslations("chromeExtension");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: t("features.quickAccess.title"),
      description: t("features.quickAccess.description"),
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: t("features.secure.title"),
      description: t("features.secure.description"),
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: t("features.aiPowered.title"),
      description: t("features.aiPowered.description"),
    },
  ];

  const steps = [
    {
      number: "1",
      title: t("steps.step1.title"),
      description: t("steps.step1.description"),
    },
    {
      number: "2",
      title: t("steps.step2.title"),
      description: t("steps.step2.description"),
    },
    {
      number: "3",
      title: t("steps.step3.title"),
      description: t("steps.step3.description"),
    },
  ];

  const handleDownload = () => {
    // TODO: 替换为实际的 Chrome Web Store 链接
    window.open(
      "https://chrome.google.com/webstore",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Hero Section */}
      <MotionDiv
        animate="visible"
        className="text-center mb-16"
        initial="hidden"
        variants={containerVariants}
      >
        <MotionDiv variants={itemVariants}>
          <Chip
            className="mb-4"
            color="primary"
            startContent={<Chrome className="w-4 h-4" />}
            variant="shadow"
          >
            {t("badge")}
          </Chip>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <h1 className={title({ size: "lg" })}>
            {t("title")}&nbsp;
            <span className={title({ color: "blue", size: "lg" })}>
              {t("titleHighlight")}
            </span>
          </h1>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <p className={subtitle({ class: "mt-4 max-w-2xl mx-auto" })}>
            {t("subtitle")}
          </p>
        </MotionDiv>

        <MotionDiv
          className="mt-8 flex gap-4 justify-center"
          variants={itemVariants}
        >
          <Button
            className="font-semibold"
            color="primary"
            endContent={<Download className="w-5 h-5" />}
            size="lg"
            variant="shadow"
            onPress={handleDownload}
          >
            {t("downloadButton")}
          </Button>
          <Button
            className="font-semibold"
            endContent={<ArrowRight className="w-5 h-5" />}
            size="lg"
            variant="bordered"
            onPress={() => {
              document
                .getElementById("how-to-install")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {t("learnMore")}
          </Button>
        </MotionDiv>
      </MotionDiv>

      {/* Features Section */}
      <MotionDiv
        animate="visible"
        className="mb-16"
        initial="hidden"
        variants={containerVariants}
      >
        <h2 className="text-3xl font-bold text-center mb-8">
          {t("featuresTitle")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <MotionCard key={index} className="p-6" variants={itemVariants}>
              <CardBody className="gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-default-600">{feature.description}</p>
              </CardBody>
            </MotionCard>
          ))}
        </div>
      </MotionDiv>

      {/* How to Install Section */}
      <MotionDiv
        animate="visible"
        className="mb-16"
        id="how-to-install"
        initial="hidden"
        variants={containerVariants}
      >
        <h2 className="text-3xl font-bold text-center mb-8">
          {t("stepsTitle")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <MotionCard key={index} className="p-6" variants={itemVariants}>
              <CardBody className="gap-4 items-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-bold text-2xl shadow-lg">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-center">
                  {step.title}
                </h3>
                <p className="text-default-600 text-center">
                  {step.description}
                </p>
              </CardBody>
            </MotionCard>
          ))}
        </div>
      </MotionDiv>

      {/* Benefits Section */}
      <MotionDiv
        animate="visible"
        initial="hidden"
        variants={containerVariants}
      >
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardHeader>
            <h2 className="text-2xl font-bold">{t("benefitsTitle")}</h2>
          </CardHeader>
          <CardBody className="gap-3">
            {[
              t("benefits.benefit1"),
              t("benefits.benefit2"),
              t("benefits.benefit3"),
              t("benefits.benefit4"),
              t("benefits.benefit5"),
            ].map((benefit, index) => (
              <MotionDiv
                key={index}
                className="flex items-start gap-3"
                variants={itemVariants}
              >
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <span className="text-default-700">{benefit}</span>
              </MotionDiv>
            ))}
          </CardBody>
        </Card>
      </MotionDiv>
    </div>
  );
}
