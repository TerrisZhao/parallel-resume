import { Spinner } from "@heroui/spinner";

export const Loading = ({ size = "lg" }: { size?: "sm" | "md" | "lg" }) => {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="scale-[1.5]" size={size} />
    </div>
  );
};
