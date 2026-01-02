"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

import { title } from "@/components/primitives";

export default function SignInPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
      } else {
        // 登录成功，重定向到简历页面
        router.push("/resume");
      }
    } catch (error) {
      setError(t("signInFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/resume" });
    } catch (error) {
      setError(t("googleSignInFailed"));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-full h-full w-full items-center justify-center bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 p-2 sm:p-4 lg:p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 pb-0 pt-6 px-6">
          <h1 className={title({ size: "sm" })}>{t("signIn")}</h1>
        </CardHeader>
        <CardBody className="gap-4 px-6 py-15">
          {error && (
            <div className="p-3 text-sm text-danger bg-danger-50 rounded-lg border border-danger-200">
              {error}
            </div>
          )}

          <Button
            className="w-full"
            isLoading={isLoading}
            startContent={<Icon icon="flat-color-icons:google" width={24} />}
            variant="bordered"
            onPress={handleGoogleSignIn}
          >
            {t("signInWith", { provider: "Google" })}
          </Button>

          <div className="flex items-center gap-4">
            <Divider className="flex-1" />
            <p className="text-tiny text-default-500">{t("or")}</p>
            <Divider className="flex-1" />
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleCredentialsSignIn}
          >
            <Input
              isRequired
              label={t("email")}
              placeholder={t("emailPlaceholder")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              isRequired
              label={t("password")}
              placeholder={t("passwordPlaceholder")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              color="primary"
              isDisabled={!email || !password}
              isLoading={isLoading}
              type="submit"
            >
              {t("signIn")}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
