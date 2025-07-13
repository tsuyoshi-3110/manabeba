"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/* Mermaid は CSR 専用 */
const Mermaid = dynamic(() => import("react-mermaid2").then((m) => m.default), {
  ssr: false,
});

/* ---------- 型 ---------- */
type Quiz = {
  question: string;
  options: string[];
  answer: string; // 例 "B" または "正方形"
  diagram?: string;
};

/* ---------- ユーティリティ ---------- */
const normalize = (s: string) =>
  s
    .replace(/^[A-DＡ-Ｄ]\s*[:．.]\s*/, "")
    .replace(/^[①-⑩]\s*/, "")
    .trim();

/** answer が A〜D なら 0-based の番号へ */
const labelToIndex = (a: string) => "ABCD".indexOf(a.toUpperCase());

/** 正誤判定 : optionIdx を受け取って比較 */
const isCorrect = (opt: string, idx: number, answer: string) => {
  const a = answer.trim().toUpperCase();

  /* ▼ パターン① answer がラベル (A〜D) */
  if (/^[A-D]$/.test(a)) {
    return idx === labelToIndex(a); // ← 位置で判定
  }

  /* ▼ パターン② 値そのものが正解文字列 */
  return normalize(opt) === normalize(answer);
};

/* ---------- Component ---------- */
export default function RetryQuizPage() {
  /* ----- URL Query ----- */
  const sp = useSearchParams();
  const router = useRouter();
  const grade = sp.get("grade") ?? "";
  const term = sp.get("term") ?? "";
  const subject = sp.get("subject") ?? "";
  const topic = sp.get("topic") ?? "";

  /* ----- State ----- */
  const TOTAL = 5;
  const [idx, setIdx] = useState(0);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [loading, setLoad] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  /* ----- Auth ----- */
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  /* ----- 1 問取得 ----- */
  const load = useCallback(async () => {
    setLoad(true);
    setSelIdx(null);
    setMsg(null);

    const res = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade, term, subject, topic }),
    });
    const data: Quiz = await res.json();
    setQuiz(data);
    setLoad(false);
  }, [grade, term, subject, topic]);

  useEffect(() => {
    if (idx < TOTAL) load();
  }, [idx, load]);

  /* ----- 選択 ----- */
  const handleSelect = (i: number) => {
    if (!quiz) return;
    setSelIdx(i);

    const ok = isCorrect(quiz.options[i], i, quiz.answer);
    setCorrect((c) => c + (ok ? 1 : 0));
    setMsg(ok ? "正解！🎉" : `不正解… 正解: ${quiz.answer}`);
  };

  /* ----- 次へ or 終了 ----- */
  const handleNext = async () => {
    if (idx + 1 < TOTAL) {
      setIdx((i) => i + 1);
      return;
    }

    /* 4/5 正解で誤答削除 */
    if (
      uid &&
      correct +
        (selIdx !== null &&
        isCorrect(quiz!.options[selIdx], selIdx, quiz!.answer)
          ? 0
          : 0) >=
        4
    ) {
      const q = query(
        collection(db, "users", uid, "mistakes"),
        where("grade", "==", grade),
        where("term", "==", term),
        where("subject", "==", subject),
        where("topic", "==", topic)
      );
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, d.ref.path))));
      alert("🎉 合格おめでとう！");
    }

    router.back();
  };

  /* ----- UI ----- */
  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-center">
        再挑戦 ({subject} / {topic}) {idx + 1}/{TOTAL}
      </h1>

      {loading && <p className="text-center text-gray-500">問題を生成中...</p>}

      {quiz && !loading && (
        <>
          {quiz.diagram?.trim() && (
            <div className="border rounded p-2 mb-4 bg-white max-h-72 overflow-auto">
              <Mermaid chart={quiz.diagram} config={{ theme: "base" }} />
            </div>
          )}

          <p className="font-semibold mb-2">{quiz.question}</p>

          {quiz.options.map((o, i) => (
            <button
              key={i}
              disabled={selIdx !== null}
              onClick={() => handleSelect(i)}
              className={`w-full px-4 py-2 border rounded text-left mb-2 ${
                selIdx !== null
                  ? isCorrect(o, i, quiz.answer)
                    ? "bg-green-200"
                    : i === selIdx
                    ? "bg-red-200"
                    : "bg-gray-100"
                  : "hover:bg-gray-100"
              }`}
            >
              {o}
            </button>
          ))}

          {msg && <p className="text-center font-semibold">{msg}</p>}

          {selIdx !== null && (
            <button
              onClick={handleNext}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded"
            >
              {idx + 1 < TOTAL ? "次の問題 →" : "終了"}
            </button>
          )}
        </>
      )}
    </main>
  );
}
