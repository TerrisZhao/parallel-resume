import Image from "next/image";
import {Icon} from "@iconify/react";
import {Spinner} from "@heroui/spinner";

export const Loading = ({ size = "lg" }: { size?: "sm" | "md" | "lg" }) => {
  return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={size} className="scale-[1.5]" />
      </div>
  );
};
