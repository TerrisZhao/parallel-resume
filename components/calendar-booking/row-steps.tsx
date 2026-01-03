"use client";

import React from "react";
import { cn } from "@heroui/theme";

interface Step {
  title: string;
}

interface RowStepsProps {
  steps: Step[];
  currentStep?: number;
  defaultStep?: number;
}

export default function RowSteps({
  steps,
  currentStep,
  defaultStep = 0,
}: RowStepsProps) {
  const activeStep = currentStep !== undefined ? currentStep : defaultStep;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={index}>
              {/* Step with Circle and Label */}
              <div className="flex items-center gap-2 relative">
                {/* Connector Line - Left Half */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute right-full w-[50vw] h-[2px] transition-colors",
                      {
                        "bg-success": index <= activeStep,
                        "bg-default-200": index > activeStep,
                      }
                    )}
                    style={{ marginRight: "0.5rem" }}
                  />
                )}

                {/* Circle */}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 font-semibold text-xs transition-colors flex-shrink-0",
                    {
                      "border-primary bg-primary text-white": isActive,
                      "border-success bg-success text-white": isCompleted,
                      "border-default-300 bg-default-100 text-default-400":
                        !isActive && !isCompleted,
                    }
                  )}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Label */}
                <p
                  className={cn("text-sm font-medium whitespace-nowrap", {
                    "text-primary": isActive,
                    "text-success": isCompleted,
                    "text-default-400": !isActive && !isCompleted,
                  })}
                >
                  {step.title}
                </p>

                {/* Connector Line - Right Half */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-full w-[50vw] h-[2px] transition-colors",
                      {
                        "bg-success": index < activeStep,
                        "bg-default-200": index >= activeStep,
                      }
                    )}
                    style={{ marginLeft: "0.5rem" }}
                  />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
