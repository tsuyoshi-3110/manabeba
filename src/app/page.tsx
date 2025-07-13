"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 space-y-6 bg-gray-50">
      <Image
        src="/images/logoClear.png"
        alt="Manabeba Logo"
        width={300}
        height={300}
        priority
      />

      <p className="text-lg text-gray-700 text-center">
        AIで学ぶ、中学生のための学習アプリ
      </p>

      {!user && (
        <>
          <Button
            onClick={() => router.push("/login/email")}
            className="w-64 text-lg"
          >
            ログイン
          </Button>

          <div className="mt-4 text-sm text-gray-500">
            アカウントをお持ちでない方はこちら
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => router.push("/signup/email")}
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm"
            >
              アカウント作成
            </Button>
          </div>
        </>
      )}

      {user && (
        <>
          <p className="text-sm text-gray-500">こんにちは {user.email}</p>

          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={() => router.push("/select")}
              className="w-64 text-lg bg-green-600 hover:bg-green-700"
            >
              ▶ 選択画面へ進む
            </Button>

            {/* ★ 復習ボタン */}
            <Button
              onClick={() => router.push("/review")}
              className="w-64 text-lg bg-orange-600 hover:bg-orange-700"
            >
              🔁 復習
            </Button>

            <Button
              onClick={handleLogout}
              className="w-64 text-sm bg-red-600 hover:bg-red-700"
            >
              ログアウト
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
