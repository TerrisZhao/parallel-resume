"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardBody } from "@heroui/card";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import { User as UserDisplay } from "@heroui/user";
import { Pagination } from "@heroui/pagination";
import { Divider } from "@heroui/divider";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/popover";
import { RadioGroup, Radio } from "@heroui/radio";
import { SearchIcon } from "@heroui/shared-icons";
import {Loading} from "@/components/loading";
import {Status} from "@/components/status";

interface User {
  id: number;
  email: string;
  name: string | null;
  role: "owner" | "admin" | "user";
  isActive: boolean;
  emailVerified: boolean;
  provider: string | null;
  credits: number;
  isSubscribed: boolean;
  createdAt: string;
  updatedAt: string;
}

type SortDescriptor = {
  column: string;
  direction: "ascending" | "descending";
};

export default function UsersPage() {
  const t = useTranslations("admin");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newRole, setNewRole] = useState<"owner" | "admin" | "user">("user");
  const [creditsAmount, setCreditsAmount] = useState("");
  const [creditsDescription, setCreditsDescription] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // 筛选和分页相关状态
  const [filterValue, setFilterValue] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "createdAt",
    direction: "descending",
  });

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      addToast({
        title: t("fetchUsersFailed"),
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 筛选逻辑
  const filteredItems = useMemo(() => {
    let filtered = [...users];

    // 搜索筛选
    if (filterValue) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(filterValue.toLowerCase()) ||
          user.name?.toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    // 角色筛选
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // 状态筛选
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) =>
        statusFilter === "active" ? user.isActive : !user.isActive
      );
    }

    // 订阅筛选
    if (subscriptionFilter !== "all") {
      filtered = filtered.filter((user) =>
        subscriptionFilter === "subscribed" ? user.isSubscribed : !user.isSubscribed
      );
    }

    return filtered;
  }, [users, filterValue, roleFilter, statusFilter, subscriptionFilter]);

  // 分页
  const pages = Math.ceil(filteredItems.length / rowsPerPage) || 1;

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  // 排序
  const sortedItems = useMemo(() => {
    return [...items].sort((a: User, b: User) => {
      let first: any = a[sortDescriptor.column as keyof User];
      let second: any = b[sortDescriptor.column as keyof User];

      if (sortDescriptor.column === "name") {
        first = a.name || "";
        second = b.name || "";
      }

      const cmp = first < second ? -1 : first > second ? 1 : 0;

      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, items]);

  // 更新用户角色
  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }

      addToast({
        title: t("roleUpdated"),
        color: "success",
      });

      setShowRoleModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to update role:", error);
      addToast({
        title: error.message || t("updateRoleFailed"),
        color: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 赠送积分
  const handleGrantCredits = async () => {
    if (!selectedUser) return;

    const amount = parseInt(creditsAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast({
        title: t("invalidCreditsAmount"),
        color: "danger",
      });
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/admin/users/${selectedUser.id}/credits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            description: creditsDescription || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to grant credits");
      }

      addToast({
        title: t("creditsGranted"),
        color: "success",
      });

      setShowCreditsModal(false);
      setCreditsAmount("");
      setCreditsDescription("");
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to grant credits:", error);
      addToast({
        title: error.message || t("grantCreditsFailed"),
        color: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 更新用户状态
  const handleUpdateStatus = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/admin/users/${selectedUser.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !selectedUser.isActive }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }

      addToast({
        title: selectedUser.isActive ? t("userDisabled") : t("userEnabled"),
        color: "success",
      });

      setShowStatusModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to update status:", error);
      addToast({
        title: error.message || t("updateStatusFailed"),
        color: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "danger";
      case "admin":
        return "warning";
      default:
        return "default";
    }
  };

  // 获取用户头像（使用邮箱生成 Gravatar 或首字母）
  const getUserAvatar = (user: User) => {
    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  const onSearchChange = useCallback((value?: string) => {
    if (value) {
      setFilterValue(value);
      setPage(1);
    } else {
      setFilterValue("");
    }
  }, []);

  const onNextPage = useCallback(() => {
    if (page < pages) {
      setPage(page + 1);
    }
  }, [page, pages]);

  const onPreviousPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  const renderCell = useCallback(
    (user: User, columnKey: React.Key) => {
      switch (columnKey) {
        case "user":
          return (
            <UserDisplay
              avatarProps={{
                radius: "lg",
                name: getUserAvatar(user),
                className: "bg-primary text-white",
              }}
              classNames={{
                name: "text-default-foreground font-medium",
                description: "text-default-500",
              }}
              description={user.email}
              name={user.name || "—"}
            />
          );
        case "role":
          return (
            <Chip color={getRoleColor(user.role)} size="sm" variant="flat">
              {t(`roles.${user.role}`)}
            </Chip>
          );
        case "credits":
          return (
            <div className="flex items-center gap-1">
              <Icon
                className="text-warning"
                icon="solar:wallet-bold-duotone"
                width={16}
              />
              <span className="text-default-foreground">{user.credits}</span>
            </div>
          );
        case "subscription":
          return (
            <Icon
              icon="solar:crown-bold"
              width={20}
              className={user.isSubscribed ? "text-warning" : "text-default-300"}
            />
          );
        case "status":
          return (
            <Status
              status={user.isActive ? "active" : "inactive"}
              label={user.isActive ? t("active") : t("inactive")}
            />
          );
        case "createdAt":
          return (
            <div className="flex items-center gap-1">
              <Icon
                className="text-default-300"
                icon="solar:calendar-minimalistic-linear"
                width={16}
              />
              <span className="text-small text-default-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          );
        case "actions":
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => {
                  setSelectedUser(user);
                  setNewRole(user.role);
                  setShowRoleModal(true);
                }}
              >
                <Icon
                  icon="solar:user-id-bold-duotone"
                  width={20}
                  className="text-default-500"
                />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => {
                  setSelectedUser(user);
                  setShowCreditsModal(true);
                }}
              >
                <Icon
                  icon="solar:wallet-bold-duotone"
                  width={20}
                  className="text-warning"
                />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => {
                  setSelectedUser(user);
                  setShowStatusModal(true);
                }}
              >
                <Icon
                  icon={
                    user.isActive
                      ? "solar:lock-bold-duotone"
                      : "solar:lock-unlocked-bold-duotone"
                  }
                  width={20}
                  className={user.isActive ? "text-danger" : "text-success"}
                />
              </Button>
            </div>
          );
        default:
          return null;
      }
    },
    [t]
  );

  const topContent = useMemo(() => {
    return (
      <div className="flex items-center gap-4 overflow-auto px-[6px] py-[4px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <Input
              className="min-w-[200px]"
              endContent={
                <SearchIcon className="text-default-400" width={16} />
              }
              placeholder={t("searchPlaceholder")}
              value={filterValue}
              onValueChange={onSearchChange}
            />
            <div>
              <Popover placement="bottom">
                <PopoverTrigger>
                  <Button
                    className="bg-default-100 text-default-800"
                    startContent={
                      <Icon
                        className="text-default-400"
                        icon="solar:tuning-2-linear"
                        width={16}
                      />
                    }
                  >
                    {t("filter")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="flex w-full flex-col gap-6 px-2 py-4">
                    <RadioGroup
                      label={t("role")}
                      value={roleFilter}
                      onValueChange={setRoleFilter}
                    >
                      <Radio value="all">{t("allRoles")}</Radio>
                      <Radio value="owner">{t("roles.owner")}</Radio>
                      <Radio value="admin">{t("roles.admin")}</Radio>
                      <Radio value="user">{t("roles.user")}</Radio>
                    </RadioGroup>

                    <RadioGroup
                      label={t("status")}
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <Radio value="all">{t("allStatuses")}</Radio>
                      <Radio value="active">{t("active")}</Radio>
                      <Radio value="inactive">{t("inactive")}</Radio>
                    </RadioGroup>

                    <RadioGroup
                      label={t("subscription")}
                      value={subscriptionFilter}
                      onValueChange={setSubscriptionFilter}
                    >
                      <Radio value="all">{t("allSubscriptions")}</Radio>
                      <Radio value="subscribed">{t("subscribed")}</Radio>
                      <Radio value="notSubscribed">{t("notSubscribed")}</Radio>
                    </RadioGroup>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Divider className="h-5" orientation="vertical" />

          <div className="text-default-800 text-sm whitespace-nowrap">
            {t("totalUsers", { count: filteredItems.length })}
          </div>
        </div>
      </div>
    );
  }, [
    filterValue,
    roleFilter,
    statusFilter,
    filteredItems.length,
    onSearchChange,
    t,
  ]);

  const bottomContent = useMemo(() => {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-2 py-2 sm:flex-row">
        <Pagination
          isCompact
          showControls
          showShadow
          color="primary"
          page={page}
          total={pages}
          onChange={setPage}
        />

      </div>
    );
  }, [page, pages, filteredItems.length, rowsPerPage, onPreviousPage, onNextPage, t]);

  const columns = [
    { key: "user", label: t("user") },
    { key: "role", label: t("role") },
    { key: "credits", label: t("credits") },
    { key: "subscription", label: t("subscription") },
    { key: "status", label: t("status") },
    { key: "createdAt", label: t("createdAt") },
    { key: "actions", label: t("actions") },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* 顶部标题栏 */}
      <div className="flex-shrink-0 border-b border-divider bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl leading-[32px] font-bold">
              {t("userManagement")}
            </h1>
            <Chip className="text-default-500" size="sm" variant="flat">
              {users.length}
            </Chip>
          </div>
          <Button
            color="primary"
            variant="light"
            startContent={<Icon icon="solar:refresh-bold-duotone" width={20} />}
            onPress={fetchUsers}
            isLoading={loading}
          >
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          {/* 过滤条件 */}
          {topContent}

          {/* 表格卡片 */}
          {loading ? (
              <Loading />
          ) : (
              <Table
                  isHeaderSticky
                  aria-label="Users table"
                  sortDescriptor={sortDescriptor}
                  onSortChange={(descriptor) => {
                    setSortDescriptor({
                      column: String(descriptor.column),
                      direction: descriptor.direction,
                    });
                  }}
              >
                <TableHeader columns={columns}>
                  {(column) => (
                      <TableColumn
                          key={column.key}
                          align={column.key === "actions" ? "end" : "start"}
                          allowsSorting={
                              column.key !== "actions" && column.key !== "status"
                          }
                      >
                        {column.label}
                      </TableColumn>
                  )}
                </TableHeader>
                <TableBody emptyContent={t("noUsers")} items={sortedItems}>
                  {(item) => (
                      <TableRow key={item.id}>
                        {(columnKey) => (
                            <TableCell>{renderCell(item, columnKey)}</TableCell>
                        )}
                      </TableRow>
                  )}
                </TableBody>
              </Table>
          )}

          {/* 分页 */}
          {bottomContent}


        </div>
      </div>

      {/* 编辑角色模态框 */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)}>
          <ModalContent>
            <ModalHeader>{t("editRole")}</ModalHeader>
            <ModalBody>
              <p className="text-sm text-default-500 mb-4">
                {t("editRoleDesc", { email: selectedUser?.email || "" })}
              </p>
              <Select
                label={t("role")}
                selectedKeys={[newRole]}
                onChange={(e) => setNewRole(e.target.value as any)}
              >
                <SelectItem key="user">{t("roles.user")}</SelectItem>
                <SelectItem key="admin">{t("roles.admin")}</SelectItem>
                <SelectItem key="owner">{t("roles.owner")}</SelectItem>
              </Select>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => setShowRoleModal(false)}
                isDisabled={actionLoading}
              >
                {t("cancel")}
              </Button>
              <Button
                color="primary"
                onPress={handleUpdateRole}
                isLoading={actionLoading}
              >
                {t("confirm")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* 赠送积分模态框 */}
        <Modal
          isOpen={showCreditsModal}
          onClose={() => setShowCreditsModal(false)}
        >
          <ModalContent>
            <ModalHeader>{t("grantCredits")}</ModalHeader>
            <ModalBody>
              <p className="text-sm text-default-500 mb-4">
                {t("grantCreditsDesc", {
                  email: selectedUser?.email || "",
                  currentCredits: selectedUser?.credits || 0,
                })}
              </p>
              <Input
                type="number"
                label={t("creditsAmount")}
                placeholder={t("creditsAmountPlaceholder")}
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(e.target.value)}
                min="1"
              />
              <Input
                label={t("description")}
                placeholder={t("descriptionPlaceholder")}
                value={creditsDescription}
                onChange={(e) => setCreditsDescription(e.target.value)}
              />
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => {
                  setShowCreditsModal(false);
                  setCreditsAmount("");
                  setCreditsDescription("");
                }}
                isDisabled={actionLoading}
              >
                {t("cancel")}
              </Button>
              <Button
                color="primary"
                onPress={handleGrantCredits}
                isLoading={actionLoading}
              >
                {t("confirm")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* 禁用/启用用户确认框 */}
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
        >
          <ModalContent>
            <ModalHeader>
              {selectedUser?.isActive ? t("disableUser") : t("enableUser")}
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-default-500">
                {selectedUser?.isActive
                  ? t("disableUserConfirm", { email: selectedUser?.email || "" })
                  : t("enableUserConfirm", { email: selectedUser?.email || "" })}
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => setShowStatusModal(false)}
                isDisabled={actionLoading}
              >
                {t("cancel")}
              </Button>
              <Button
                color={selectedUser?.isActive ? "danger" : "success"}
                onPress={handleUpdateStatus}
                isLoading={actionLoading}
              >
                {t("confirm")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
    </div>
  );
}
