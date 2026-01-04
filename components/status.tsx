import React, { forwardRef, memo } from "react";
import clsx from "clsx";

export type StatusOptions = "active" | "inactive";

const statusColorMap: Record<StatusOptions, React.ReactNode> = {
  active: <div className="h-2 w-2 rounded-full bg-success" />,
  inactive: <div className="h-2 w-2 rounded-full bg-danger" />,
};

export interface StatusProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  status: StatusOptions;
  label?: string;
}

export const Status = memo(
  forwardRef<HTMLDivElement, StatusProps>((props, forwardedRef) => {
    const { className, status, label } = props;
    const statusColor = statusColorMap[status];

    return (
      <div
        ref={forwardedRef}
        className={clsx(
          "bg-default-100 flex w-fit items-center gap-[2px] rounded-lg px-2 py-1",
          className,
        )}
      >
        {statusColor}
        <span className="text-default-800 px-1">{label || status}</span>
      </div>
    );
  }),
);

Status.displayName = "Status";
