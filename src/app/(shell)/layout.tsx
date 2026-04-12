import { BottomNav } from "@/components/shell/BottomNav";
import { CategoriesProvider } from "@/contexts/CategoriesContext";
import { TransactionsProvider } from "@/contexts/TransactionsContext";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CategoriesProvider>
      <TransactionsProvider>
        <div className="relative mx-auto min-h-dvh max-w-lg">
          <div className="pb-safe px-4 pb-28 pt-4">{children}</div>
          <BottomNav />
        </div>
      </TransactionsProvider>
    </CategoriesProvider>
  );
}
