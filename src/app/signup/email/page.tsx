"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitFlag, setSubmitFlag] = useState(false);
  const handleSignUp = async () => {
    setError(""); // エラー初期化
    try {
      setSubmitFlag(true);
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/"); // 作成成功後にホームへ
    } catch (err: unknown) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("登録に失敗しました");
      }
    } finally {
      setSubmitFlag(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">アカウント作成</h1>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <Input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={handleSignUp}
            disabled={submitFlag}
          >
            アカウントを作成
          </Button>
        </div>
      </div>
    </main>
  );
}
