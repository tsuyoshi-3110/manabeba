"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/* Mermaid は CSR だけで読み込む */

/* ---------- 型 ---------- */
type Quiz = {
  question: string;
  options: string[]; // ラベル無し
  answer: string; // 例) "B" or "−5"
  diagram?: string;
};

type WrongLog = {
  question: string;
  selected: string;
  correct: string;
  subject: string;
  topic: string;
  grade: string;
  term: string;
};

/* ---------- ユーティリティ ---------- */
const letters = ["A", "B", "C", "D"] as const;

const normalize = (s: string) =>
  s
    .replace(/^[A-DＡ-Ｄ]\s*[:．.]\s*/, "")
    .replace(/^[①-⑩]\s*/, "")
    .trim();

const isCorrect = (
  pickedLabel: string, // A/B/C/D
  pickedText: string, // 実テキスト
  answer: string
) => {
  const ans = answer.trim().toUpperCase();
  return /^[A-D]$/.test(ans)
    ? pickedLabel === ans
    : normalize(pickedText) === normalize(answer);
};

/* ---------- Component ---------- */
export default function QuizPage() {
  /* クエリ */
  const sp = useSearchParams();
  const router = useRouter();
  const grade = sp.get("grade") ?? "";
  const term = sp.get("term") ?? "";
  const subject = sp.get("subject") ?? "";
  const topic = sp.get("topic") ?? "";

  /* state */
  const TOTAL = 5;
  const [idx, setIdx] = useState(0);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [sel, setSel] = useState<string | null>(null); // A/B/C/D
  const [msg, setMsg] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [load, setLoad] = useState(false);
  const [wrong, setWrong] = useState<WrongLog[]>([]);

  /* 認証 */
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  /* 1問取得 */
  const fetchQuiz = useCallback(async () => {
    if (idx >= TOTAL) return;

    setLoad(true);
    setSel(null);
    setMsg(null);

    const res = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade, term, subject, topic }),
    });

    if (!res.ok) {
      console.error(await res.text());
      setLoad(false);
      return;
    }

    const data: Quiz = await res.json();
    console.log("[quiz]", data);
    setQuiz(data);
    setLoad(false);
  }, [idx, grade, term, subject, topic]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  /* 選択 */
  const handleSelect = (label: string, text: string) => {
    if (!quiz) return;
    setSel(label);

    const ok = isCorrect(label, text, quiz.answer);
    setMsg(ok ? "正解！🎉" : `不正解… 正解: ${quiz.answer}`);

    if (!ok) {
      setWrong((p) => [
        ...p,
        {
          question: quiz.question,
          selected: text,
          correct: quiz.answer,
          subject,
          topic,
          grade,
          term,
        },
      ]);
    }
  };

  /* 次へ */
  const handleNext = async () => {
    if (idx + 1 < TOTAL) {
      setIdx((i) => i + 1);
      return;
    }

    /* 誤答保存 */
    if (uid && wrong.length) {
      const gid = new Date().toISOString();
      await Promise.all(
        wrong.map((w) =>
          addDoc(collection(db, "users", uid, "mistakes"), {
            ...w,
            groupId: gid,
            timestamp: serverTimestamp(),
          })
        )
      );
    }

    if (wrong.length <= 1) {
      alert("🎉 合格おめでとう！\nホームに戻ります。");
      router.replace("/");
    } else {
      router.push("/result");
    }
  };

  const hasLeadingLabel = (s: string) => /^[A-DＡ-Ｄ]\s*[:．.]/i.test(s.trim());

  /* ---------- UI ---------- */
  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-center">
        🧠 クイズ ({subject} / {topic}) {idx + 1}/{TOTAL}
      </h1>

      {load && <p className="text-center text-gray-500">問題を生成中...</p>}

      {quiz && !load && (
        <>
          <p className="font-semibold mb-2">{quiz.question}</p>

          {quiz.options.map((text, i) => {
            const label = letters[i] ?? String.fromCharCode(65 + i);
            const render = hasLeadingLabel(text) ? text : `${label}: ${text}`;
            const picked = sel === label;
            const correct = isCorrect(label, text, quiz.answer);

            return (
              <button
                key={label}
                disabled={!!sel}
                onClick={() => handleSelect(label, text)}
                className={`w-full px-4 py-2 border rounded text-left mb-2 ${
                  sel
                    ? correct
                      ? "bg-green-200"
                      : picked
                      ? "bg-red-200"
                      : "bg-gray-100"
                    : "hover:bg-gray-100"
                }`}
              >
                {render}
              </button>
            );
          })}

          {msg && <p className="text-center font-semibold">{msg}</p>}

          {sel && (
            <button
              onClick={handleNext}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded"
            >
              {idx + 1 < TOTAL ? "次の問題 →" : "結果を見る"}
            </button>
          )}
        </>
      )}
    </main>
  );
}
