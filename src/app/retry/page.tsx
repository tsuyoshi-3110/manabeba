"use client";

import { useCallback, useEffect, useState } from "react";
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

/* ───────── 型 ───────── */
type Quiz = { question: string; options: string[]; answer: string };

/* ───────── 文字列正規化 ─────────
   ・記号／空白を取り除き値だけ残す                  */
const normalize = (s: string) =>
  s
    .replace(/^[A-DＡ-Ｄ]\s*[:．.]\s*/, "") // 「A:」「Ａ．」などラベル+区切り
    .replace(/^[①-⑩]\s*/, "")            // ① ② … を除去したい場合
    .trim();

/* ───────── ラベル抽出（A〜D） ───────── */
const getLabel = (s: string) => {
  const m = s.trim().match(/^([A-DＡ-Ｄ])(?:\s*[:．.])?/);
  return m ? m[1].toUpperCase() : null;
};

/* ───────── 正誤判定 ─────────
   ・answer が “A”〜“D” だけならラベル比較
   ・それ以外なら値を normalize 同士で比較            */
const isCorrect = (opt: string, answer: string) => {
  const labelAns = answer.trim().toUpperCase();
  const labelOpt = (getLabel(opt) ?? "").toUpperCase();

  /* ラベル回答パターン (A〜D) */
  if (/^[A-D]$/.test(labelAns)) {
    return labelAns === labelOpt;
  }

  /* 値そのものが回答パターン */
  return normalize(opt) === normalize(answer);
};

/* ───────── Component ───────── */
export default function RetryQuizPage() {
  const sp     = useSearchParams();
  const router = useRouter();

  /* URL パラメータ */
  const grade   = sp.get("grade")   ?? "";
  const term    = sp.get("term")    ?? "";
  const subject = sp.get("subject") ?? "";
  const topic   = sp.get("topic")   ?? "";

  /* state */
  const [quiz, setQuiz]           = useState<Quiz | null>(null);
  const [idx , setIdx]            = useState(0);       // 0–4
  const [correctCnt, setCorrect]  = useState(0);
  const [selected, setSelected]   = useState<string | null>(null);
  const [msg, setMsg]             = useState<string | null>(null);
  const [uid, setUid]             = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  /* uid 取得 */
  useEffect(() =>
    onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  /* 1問取得 */
  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    setMsg(null);

    const res = await fetch("/api/generate-quiz", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ grade, term, subject, topic }),
    });

    const q: Quiz = await res.json();
    setQuiz(q);
    setLoading(false);
  }, [grade, term, subject, topic]);

  /* 初回 + idx 変化で発火 */
  useEffect(() => { if (idx < 5) loadQuiz(); }, [idx, loadQuiz]);

  /* 選択処理 */
  const handleSelect = (opt: string) => {
    if (!quiz) return;
    setSelected(opt);

    const ok = isCorrect(opt, quiz.answer);
    setCorrect((c) => c + (ok ? 1 : 0));
    setMsg(ok ? "正解！🎉" : `不正解… 正解: ${quiz.answer}`);
  };

  /* 次へ or 終了 */
  const handleNext = async () => {
    if (idx < 4) {
      setIdx((i) => i + 1);
      return;
    }

    /* 4/5 以上正解なら間違い履歴を削除 */
    if (correctCnt + (selected ? (isCorrect(selected, quiz!.answer) ? 1 : 0) : 0) >= 4 && uid) {
      const q = query(
        collection(db, "users", uid, "mistakes"),
        where("grade"  , "==", grade),
        where("term"   , "==", term),
        where("subject", "==", subject),
        where("topic"  , "==", topic)
      );
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, d.ref.path))));
    }

    alert("再挑戦終了！");
    router.back();
  };

  /* ───────── JSX ───────── */
  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-center">
        再挑戦 ({subject} / {topic}) {idx + 1}/5
      </h1>

      {loading && <p className="text-center text-gray-500">問題を生成中...</p>}

      {quiz && !loading && (
        <>
          <p className="font-semibold">{quiz.question}</p>

          {quiz.options.map((o, i) => (
            <button
              key={i}
              disabled={!!selected}
              onClick={() => handleSelect(o)}
              className={`w-full px-4 py-2 border rounded text-left mb-2 ${
                selected
                  ? isCorrect(o, quiz.answer)
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

          {msg && <p className="text-center font-semibold">{msg}</p>}

          {selected && (
            <button
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded"
              onClick={handleNext}
            >
              {idx < 4 ? "次の問題 →" : "終了"}
            </button>
          )}
        </>
      )}
    </main>
  );
}
