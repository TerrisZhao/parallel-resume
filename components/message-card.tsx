"use client";

import React from "react";
import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { useClipboard } from "@heroui/use-clipboard";
import { Icon } from "@iconify/react";
import clsx from "clsx";

export type MessageCardProps = React.HTMLAttributes<HTMLDivElement> & {
  avatar?: string;
  showFeedback?: boolean;
  message?: React.ReactNode;
  title?: string;
  type?:
    | "system"
    | "notification"
    | "announcement"
    | "credits"
    | "subscription";
  status?: "success" | "failed" | "unread" | "read";
  messageClassName?: string;
  onMessageCopy?: (content: string | string[]) => void;
  onFeedback?: (feedback: "like" | "dislike") => void;
  createdAt?: string;
};

const MessageCard = React.forwardRef<HTMLDivElement, MessageCardProps>(
  (
    {
      avatar,
      message,
      title,
      type = "notification",
      showFeedback = false,
      status = "unread",
      onMessageCopy,
      onFeedback,
      className,
      messageClassName,
      createdAt,
      ...props
    },
    ref,
  ) => {
    const [feedback, setFeedback] = React.useState<"like" | "dislike">();

    const messageRef = React.useRef<HTMLDivElement>(null);

    const { copied, copy } = useClipboard();

    const failedMessageClassName =
      status === "failed"
        ? "bg-danger-100/50 border border-danger-100 text-foreground"
        : "";

    const hasFailed = status === "failed";
    const isUnread = status === "unread";

    // 根据消息类型选择默认头像
    const getDefaultAvatar = () => {
      switch (type) {
        case "system":
        case "announcement":
          return "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatar_ai.png";
        case "credits":
        case "subscription":
          return "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatar_ai.png";
        default:
          return "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatar_ai.png";
      }
    };

    const handleCopy = React.useCallback(() => {
      let stringValue = "";

      if (typeof message === "string") {
        stringValue = message;
      } else if (Array.isArray(message)) {
        message.forEach((child) => {
          const childString =
            typeof child === "string"
              ? child
              : (child as any)?.props?.children?.toString();

          if (childString) {
            stringValue += childString + "\n";
          }
        });
      }

      const valueToCopy = stringValue || messageRef.current?.textContent || "";

      copy(valueToCopy);

      onMessageCopy?.(valueToCopy);
    }, [copy, message, onMessageCopy]);

    const handleFeedback = React.useCallback(
      (liked: boolean) => {
        setFeedback(liked ? "like" : "dislike");

        onFeedback?.(liked ? "like" : "dislike");
      },
      [onFeedback],
    );

    return (
      <div {...props} ref={ref} className={clsx("flex gap-3", className)}>
        <div className="relative flex-none">
          <Badge
            isOneChar
            color={isUnread ? "primary" : "default"}
            content={
              isUnread ? (
                <Icon
                  className="text-background"
                  icon="solar:bell-bold"
                  width={12}
                />
              ) : hasFailed ? (
                <Icon
                  className="text-background"
                  icon="gravity-ui:circle-exclamation-fill"
                />
              ) : null
            }
            isInvisible={!isUnread && !hasFailed}
            placement="bottom-right"
            shape="circle"
          >
            <Avatar src={avatar || getDefaultAvatar()} />
          </Badge>
        </div>
        <div className="flex w-full flex-col gap-2">
          {/* 消息标题 */}
          {title && (
            <div className="flex items-center justify-between">
              <h4
                className={clsx(
                  "text-small font-semibold",
                  isUnread && "text-foreground",
                )}
              >
                {title}
              </h4>
              {createdAt && (
                <span className="text-tiny text-default-400">
                  {new Date(createdAt).toLocaleString()}
                </span>
              )}
            </div>
          )}
          {/* 消息内容 */}
          <div
            className={clsx(
              "rounded-medium bg-content2 text-default-600 relative w-full px-4 py-3",
              failedMessageClassName,
              isUnread && "bg-primary-50/50 dark:bg-primary-100/10",
              messageClassName,
            )}
          >
            <div ref={messageRef} className={"text-small pr-20"}>
              {message}
            </div>
            {showFeedback && !hasFailed && (
              <div className="bg-content2 shadow-small absolute top-2 right-2 flex rounded-full">
                <Button
                  isIconOnly
                  radius="full"
                  size="sm"
                  variant="light"
                  onPress={handleCopy}
                >
                  {copied ? (
                    <Icon
                      className="text-default-600 text-lg"
                      icon="gravity-ui:check"
                    />
                  ) : (
                    <Icon
                      className="text-default-600 text-lg"
                      icon="gravity-ui:copy"
                    />
                  )}
                </Button>
                <Button
                  isIconOnly
                  radius="full"
                  size="sm"
                  variant="light"
                  onPress={() => handleFeedback(true)}
                >
                  {feedback === "like" ? (
                    <Icon
                      className="text-default-600 text-lg"
                      icon="gravity-ui:thumbs-up-fill"
                    />
                  ) : (
                    <Icon
                      className="text-default-600 text-lg"
                      icon="gravity-ui:thumbs-up"
                    />
                  )}
                </Button>
                <Button
                  isIconOnly
                  radius="full"
                  size="sm"
                  variant="light"
                  onPress={() => handleFeedback(false)}
                >
                  {feedback === "dislike" ? (
                    <Icon
                      className="text-default-600 text-lg"
                      icon="gravity-ui:thumbs-down-fill"
                    />
                  ) : (
                    <Icon
                      className="text-default-600 text-lg"
                      icon="gravity-ui:thumbs-down"
                    />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export default MessageCard;

MessageCard.displayName = "MessageCard";
