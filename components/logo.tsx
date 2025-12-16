import Image from "next/image";

export const Logo = () => {
  return (
    <Image
      alt="Logo"
      className="rounded-md"
      height={32}
      src="/favicon.ico"
      width={32}
    />
  );
};
