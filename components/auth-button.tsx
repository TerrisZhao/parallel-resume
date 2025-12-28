"use client";

import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function AuthButton() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("navbar");
  const tCommon = useTranslations("common");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (status === "loading") {
    return (
      <Button
        isLoading
        className="text-sm font-normal text-default-600 bg-default-100"
        variant="flat"
      >
        {t("loading")}
      </Button>
    );
  }

  if (session) {
    return (
      <>
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Avatar
              isBordered
              as="button"
              className="transition-transform"
              color="secondary"
              name={session.user?.name || session.user?.email || t("user")}
              size="sm"
              src={session.user?.image || undefined}
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="Profile Actions" variant="flat">
            <DropdownItem key="profile" className="h-14 gap-2">
              <p className="font-semibold">{t("signedInAs")}</p>
              <p className="font-semibold">{session.user?.email}</p>
            </DropdownItem>
            <DropdownItem key="resume" onPress={() => router.push("/resume")}>
              {t("myResumes")}
            </DropdownItem>
            <DropdownItem key="settings" onPress={() => router.push("/settings")}>
              {t("settings")}
            </DropdownItem>
            {/* Subscription功能已禁用 */}
            {/* <DropdownItem
              key="subscription"
              onPress={() => router.push("/subscription")}
            >
              {t("subscription")}
            </DropdownItem> */}
            <DropdownItem
              key="logout"
              color="danger"
              onPress={() => setShowLogoutModal(true)}
            >
              {t("logout")}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Modal isOpen={showLogoutModal} onOpenChange={setShowLogoutModal}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  {t("logout")}
                </ModalHeader>
                <ModalBody>
                  <p>{t("logoutConfirm")}</p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    color="danger"
                    onPress={() => {
                      onClose();
                      signOut({ callbackUrl: "/" });
                    }}
                  >
                    {t("logout")}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </>
    );
  }

  return (
    <Button
      className="text-sm font-normal text-default-600 bg-default-100"
      variant="flat"
      onPress={() => signIn()}
    >
      {t("signIn")}
    </Button>
  );
}
