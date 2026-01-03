"use client";

import { useEffect, useState, useCallback, useContext } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Icon } from "@iconify/react";

import MessageCard from "@/components/message-card";
import { PageHeaderContext } from "../page-header-context";

interface Message {
  id: number;
  type: "system" | "notification" | "announcement" | "credits" | "subscription";
  title: string;
  content: string;
  isRead: boolean;
  metadata?: any;
  relatedId?: number;
  relatedType?: string;
  createdAt: string;
  readAt?: string | null;
}

export default function MessagesPage() {
  const t = useTranslations("messages");
  const tCommon = useTranslations("common");
  const { setHeader, refreshUnreadCount } = useContext(PageHeaderContext);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // 设置页面标题
  useEffect(() => {
    setHeader(
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-small text-default-500">{t("description")}</p>
        </div>
        <Button
          color="primary"
          startContent={<Icon icon="solar:check-read-bold" width={20} />}
          variant="flat"
          isLoading={markingAllRead}
          onPress={handleMarkAllRead}
        >
          {t("markAllRead")}
        </Button>
      </div>
    );
  }, [setHeader, t, markingAllRead]);

  // 获取消息列表
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/messages");

      if (response.ok) {
        const data = await response.json();

        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // 标记单条消息为已读
  const handleMarkAsRead = async (messageId: number) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: "PATCH",
      });

      if (response.ok) {
        // 更新本地状态
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, isRead: true, readAt: new Date().toISOString() }
              : msg
          )
        );
        // 刷新未读消息数量
        if (refreshUnreadCount) {
          refreshUnreadCount();
        }
      }
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  // 处理消息点击
  const handleMessageClick = (msg: Message) => {
    // 如果消息未读，标记为已读
    if (!msg.isRead) {
      handleMarkAsRead(msg.id);
    }

    // 如果消息有跳转链接，进行跳转
    if (msg.metadata?.link) {
      window.location.href = msg.metadata.link;
    }
  };

  // 标记所有消息为已读
  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      const response = await fetch("/api/messages/read-all", {
        method: "PATCH",
      });

      if (response.ok) {
        // 更新本地状态
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            isRead: true,
            readAt: msg.readAt || new Date().toISOString(),
          }))
        );
        // 刷新未读消息数量
        if (refreshUnreadCount) {
          refreshUnreadCount();
        }
      }
    } catch (error) {
      console.error("Failed to mark all messages as read:", error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Icon
          className="text-default-300"
          icon="solar:mailbox-bold-duotone"
          width={120}
        />
        <p className="text-default-500">{t("noMessages")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-1">
      {messages.map((msg) => (
        <div
          key={msg.id}
          onClick={() => handleMessageClick(msg)}
          className={`relative ${msg.metadata?.link ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
        >
          <MessageCard
            title={msg.title}
            message={msg.content}
            type={msg.type}
            status={msg.isRead ? "read" : "unread"}
            createdAt={msg.createdAt}
            showFeedback={false}
          />
          {msg.metadata?.link && (
            <div className="absolute bottom-3 right-3">
              <Icon
                className="text-primary"
                icon="solar:arrow-right-bold-duotone"
                width={20}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
