"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  fetchCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
  type CategoryRow,
} from "@/lib/ledger-data";

type CategoriesContextValue = {
  categories: CategoryRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addCategory: (name: string, type: "expense" | "income") => Promise<void>;
  editCategory: (id: string, name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
};

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error("useCategories must be used within a CategoriesProvider");
  }
  return ctx;
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const cats = await fetchCategories(sb);
      setCategories(cats);
    } catch (e) {
      console.error("Failed to fetch categories:", e);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addCategory = useCallback(
    async (name: string, type: "expense" | "income") => {
      if (!isSupabaseConfigured()) return;

      const sb = createBrowserSupabaseClient();
      if (!sb) return;

      try {
        await insertCategory(sb, { name: name.trim(), type });
        await refresh();
      } catch (e) {
        console.error("Failed to add category:", e);
        throw e;
      }
    },
    [refresh]
  );

  const editCategory = useCallback(
    async (id: string, name: string) => {
      if (!isSupabaseConfigured()) return;

      const sb = createBrowserSupabaseClient();
      if (!sb) return;

      try {
        await updateCategory(sb, id, { name: name.trim() });
        await refresh();
      } catch (e) {
        console.error("Failed to update category:", e);
        throw e;
      }
    },
    [refresh]
  );

  const removeCategory = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured()) return;

      const sb = createBrowserSupabaseClient();
      if (!sb) return;

      try {
        await deleteCategory(sb, id);
        await refresh();
      } catch (e) {
        console.error("Failed to delete category:", e);
        throw e;
      }
    },
    [refresh]
  );

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        loading,
        error,
        refresh,
        addCategory,
        editCategory,
        removeCategory,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}