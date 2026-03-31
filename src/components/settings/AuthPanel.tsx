"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setLoading(false);
      return;
    }

    let mounted = true;
    void (async () => {
      const { data } = await sb.auth.getSession();
      if (!mounted) return;
      setUserId(data.session?.user.id ?? null);
      setLoading(false);
    })();

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const sb = createBrowserSupabaseClient();

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm font-semibold">账户</p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        用 Supabase Auth 登录后才能写入（添加账户、记账等）。
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-stone-500">加载中…</p>
      ) : userId ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl bg-stone-50 px-3 py-2.5 text-xs text-stone-700 dark:bg-neutral-950 dark:text-stone-200">
            已登录：<span className="font-mono">{userId}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              setError(null);
              if (!sb) return;
              const { error: e } = await sb.auth.signOut();
              if (e) setError(e.message);
            }}
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-200 dark:hover:bg-neutral-900"
          >
            退出登录
          </button>
        </div>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (!sb) {
              setError("未配置 Supabase");
              return;
            }
            const { error: err } = await sb.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
            if (err) setError(err.message);
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            登录
          </button>
        </form>
      )}
    </div>
  );
}

