"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/* ---------- 型 ---------- */
type Quiz = {
  question: string;
  options: string[];
  answer: string;
};

type WrongLog = {
  question: string;
  selected: string;
  correct: string;
  subject: string;
  topic: string;
};

/* ---------- Component ---------- */
export default function QuizPage() {
  const sp = useSearchParams();
  const router = useRouter();

  /* クエリ取得（単一） */
  const grade   = sp.get("grade")   ?? "";
  const term    = sp.get("term")    ?? "";
  const subject = sp.get("subject") ?? "";
  const topic   = sp.get("topic")   ?? "";

  /* state */
  const [quizIdx, setQuizIdx]   = useState(0);
  const [quiz, setQuiz]         = useState<Quiz | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [uid, setUid]           = useState<string | null>(null);
  const [wrongs, setWrongs]     = useState<WrongLog[]>([]);

  const totalQuestions = 5;          // 1 教科 5 問

  /* 認証監視 */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  /* クイズ取得 */
  const fetchQuiz = useCallback(async () => {
    if (quizIdx >= totalQuestions) return;
    setLoading(true);
    setSelected(null);
    setResultMsg(null);

    const res = await fetch("/api/generate-quiz", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ grade, subject, term, topic }),
    });

    if (!res.ok) {
      console.error("API error", await res.text());
      setLoading(false);
      return;
    }

    const q: Quiz = await res.json();
    setQuiz(q);
    setLoading(false);
  }, [quizIdx, grade, subject, term, topic]);

  /* 問番が変わるたび取得 */
  useEffect(() => { fetchQuiz(); }, [quizIdx, fetchQuiz]);

  /* 回答処理 */
  const handleSelect = (opt: string) => {
    if (!quiz) return;
    setSelected(opt);
    const correct = quiz.answer;
    const ok = opt === correct;
    setResultMsg(ok ? "正解！🎉" : `不正解… 正解: ${correct}`);

    if (!ok) {
      setWrongs((prev) => [
        ...prev,
        { question: quiz.question, selected: opt, correct, subject, topic },
      ]);
    }
  };

  /* 次へ */
  const handleNext = async () => {
    if (quizIdx + 1 < totalQuestions) {
      setQuizIdx((p) => p + 1);
    } else {
      /* 終了 ⇒ 誤答保存 */
      if (uid && wrongs.length) {
        const gid = new Date().toISOString();
        await Promise.all(
          wrongs.map((w) =>
            addDoc(collection(db, "users", uid, "mistakes"), {
              ...w,
              grade,
              term,
              groupId: gid,
              timestamp: serverTimestamp(),
            })
          )
        );
      }
      router.push("/result");
    }
  };

  /* ---------- JSX ---------- */
  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">
        🧠 クイズ（{subject} / {topic}） {quizIdx + 1}/{totalQuestions}
      </h1>

      {loading && <p className="text-center text-gray-500">問題を生成中...</p>}

      {quiz && !loading && (
        <>
          <p className="font-semibold text-lg">{quiz.question}</p>

          {quiz.options.map((o, i) => (
            <button
              key={i}
              disabled={!!selected}
              onClick={() => handleSelect(o)}
              className={`w-full px-4 py-2 border rounded text-left mb-2 ${
                selected
                  ? o === quiz.answer
                    ? "bg-green-200"
                    : o === selected
                    ? "bg-red-200"
                    : "bg-gray-100"
                  : "hover:bg-gray-100"
              }`}
            >
              {o}
            </button>
          ))}

          {resultMsg && (
            <p className="text-center font-semibold">{resultMsg}</p>
          )}

          {selected && (
            <button
              onClick={handleNext}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded"
            >
              {quizIdx + 1 < totalQuestions ? "次の問題へ →" : "結果を見る"}
            </button>
          )}
        </>
      )}
    </main>
  );
}
