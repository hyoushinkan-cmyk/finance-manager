import { BottomNav } from "@/components/shell/BottomNav";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto min-h-dvh max-w-lg">
      <div className="pb-safe px-4 pb-28 pt-4">{children}</div>
      <BottomNav />
    </div>
  );
}
