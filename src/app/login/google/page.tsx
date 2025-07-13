"use client";

import { useEffect, useState } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, provider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/* サインイン前後で一度だけ使うフラグ */
const REDIRECT_FLAG = "mbb_redirecting";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  /* ──────────────────────────────────────
     ① ページ読み込み時：認証状況をチェック
  ────────────────────────────────────── */
  useEffect(() => {
    let resolved = false; // 2 重 redirect を防ぐため
    const moveHome = () => {
      if (!resolved) {
        resolved = true;
        /** replace() で履歴に /login を残さない */
        router.replace("/");
        sessionStorage.removeItem(REDIRECT_FLAG);
      }
    };

    /* A. Redirect 戻り結果を先に見る */
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) moveHome();
      })
      .catch((e) => {
        console.error("getRedirectResult error:", e);
      });

    /* B. その後に auth 状態変化も監視 */
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) moveHome();
      else {
        /** redirect フラグが残っているのに user が居なければ失敗 */
        if (sessionStorage.getItem(REDIRECT_FLAG))
          setError("ログインがキャンセルされたか、失敗しました。");
      }
    });
    return () => unsub();
  }, [router]);

  /* ──────────────────────────────────────
     ② [Googleでログイン] クリック
  ────────────────────────────────────── */
  const handleLogin = async () => {
    try {
      const isMobile =
        typeof window !== "undefined" &&
        /iPhone|iPad|Android/.test(navigator.userAgent);

      if (isMobile) {
        /** Redirect フロー */
        sessionStorage.setItem(REDIRECT_FLAG, "1");
        await signInWithRedirect(auth, provider);
      } else {
        /** Popup フロー */
        await signInWithPopup(auth, provider);
        router.replace("/"); // Popup 成功時に即遷移
      }
    } catch (err) {
      /** ここを書き換えて詳細を表示 */
      const e = err as { code?: string; message?: string };
      console.error("signIn error:", e);
      setError(`code: ${e.code ?? "unknown"} / ${e.message ?? ""}`);
      sessionStorage.removeItem(REDIRECT_FLAG);
    }
  };

  /* ──────────────────────────────────────
     ③ UI
  ────────────────────────────────────── */
  return (
    <main className="flex flex-col items-center justify-center h-screen px-4 bg-gray-50">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-2xl font-bold">マナベバ ログイン</h1>
        <p className="text-gray-600">Googleアカウントでログインしてください</p>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleLogin} className="w-full">
          Googleでログイン
        </Button>
      </div>
    </main>
  );
}
