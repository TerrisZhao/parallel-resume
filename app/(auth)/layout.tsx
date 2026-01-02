export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col h-screen w-full">
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
