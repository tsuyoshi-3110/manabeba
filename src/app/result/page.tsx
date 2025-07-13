"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

/* ───────── 型 ───────── */
type Mistake = {
  question: string;
  options: string[];
  correct: string;
  selected: string;
  subject: string;
  topic: string; // ★ 追加
  grade: string;
  term: string;
  groupId: string;
  timestamp?: { seconds: number };
};

export default function ResultPage() {
  /* ── state ─────────────────┐*/
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoErr, setVideoErr] = useState(false);
  const router = useRouter();
  /* ──────────────────────────┘*/

  /* ── Firestore から誤答取得 ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(
          collection(db, "users", user.uid, "mistakes"),
          orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        setMistakes(snap.docs.map((d) => d.data() as Mistake));
      } else {
        setMistakes([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ── 直近 1 回分を抽出 ──────── */
  const latestGroup = useMemo(() => {
    const grouped = mistakes.reduce((acc, m) => {
      (acc[m.groupId] ??= []).push(m);
      return acc;
    }, {} as Record<string, Mistake[]>);

    return Object.entries(grouped)
      .sort(
        (a, b) =>
          (b[1][0]?.timestamp?.seconds ?? 0) -
          (a[1][0]?.timestamp?.seconds ?? 0)
      )
      .slice(0, 1);
  }, [mistakes]);

  const latestMistakes = useMemo(
    () => latestGroup[0]?.[1] ?? [],
    [latestGroup]
  );

  const totalQuestions = 5; //← 実数に合わせて
  const accuracy = Math.round(
    ((totalQuestions - latestMistakes.length) / totalQuestions) * 100
  );

  /* ── YouTube 推薦 ──────────── */
  useEffect(() => {
    const { subject, grade, term, topic } = latestMistakes[0];
    fetch("/api/youtube-recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, grade, term, topic }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: { videoId: string | null }) => {
        if (d.videoId) {
          setVideoId(d.videoId);
          setVideoErr(false);
          console.log("videoId from API:", d.videoId);
        } else {
          setVideoErr(true);
        }
      })
      .catch((err) => {
        console.error("YouTube fetch error:", err);
        setVideoId(null);
        setVideoErr(true);
      });
  }, [accuracy, latestMistakes]);

  /* ── ローディング表示 ───────── */
  if (loading) return <p className="p-6 text-center">読み込み中...</p>;

  /* ── 画面描画 ───────────────── */
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">📊 結果画面（間違えた問題）</h1>

      {latestGroup.length === 0 ? (
        <p className="text-gray-600">間違えた問題はありません。</p>
      ) : (
        latestGroup.map(([gid, items]) => (
          <div key={gid} className="space-y-4">
            <p className="font-semibold">
              正答率 {accuracy}%（{totalQuestions - items.length}/
              {totalQuestions} 問）
            </p>

            {/* 参考動画 */}
            {videoId && (
              <div className="aspect-video w-full">
                <iframe
                  className="w-full h-full rounded"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="参考動画"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {videoErr && (
              <p className="text-sm text-red-500">
                参考動画の取得に失敗しました。時間をおいて再度お試しください。
              </p>
            )}

            {/* 間違い一覧 */}
            <ul className="space-y-3">
              {items.map((m, i) => (
                <li key={i} className="bg-white p-4 rounded shadow">
                  <p>❓ {m.question}</p>
                  <p className="text-sm text-gray-500 mb-1">
                    教科: {m.subject} ／ 単元: {m.topic}
                  </p>
                  <p className="text-red-600">あなた: {m.selected}</p>
                  <p className="text-green-600">正解: {m.correct}</p>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <button
        onClick={() => router.push("/")}
        className="mt-4 bg-blue-600 text-white rounded px-6 py-2"
      >
        ホームへ戻る
      </button>
    </main>
  );
}
