"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithPopup,
  onAuthStateChanged,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function GoogleSignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/");
      } else {
        setLoading(false); // 未ログイン状態が確認できたら表示する
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignup = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // ログイン成功時、自動的に useEffect で "/" に遷移される
    } catch (err) {
      console.error(err);
      setError("Googleアカウントでのログインに失敗しました。");
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center h-screen">
        <p className="text-gray-500">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow space-y-6 text-center">
        <h1 className="text-2xl font-bold">Googleでアカウント作成</h1>
        <p className="text-gray-600">
          Googleアカウントでサインアップしてください
        </p>

        {error && (
          <div className="bg-red-100 text-red-800 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignup}
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
        >
          Googleでサインアップ
        </button>
      </div>
    </main>
  );
}
