"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/* ---------- 型 ---------- */
type Mistake = {
  question: string;
  correct: string;
  selected: string;
  subject: string;
  topic: string;
  grade: string; // 追加
  term: string; // 追加
  timestamp?: { seconds: number };
};

type VideoMap = Record<string, Record<string, string | null>>; // subject → topic → videoId

/* ---------- Component ---------- */
export default function ReviewGroupedPage() {
  const router = useRouter();

  /* ① Firestore から読み込んだ誤答を教科→単元でまとめる */
  const [grouped, setGrouped] = useState<
    Record<string, Record<string, Mistake[]>>
  >({});
  /* ② YouTube 動画 ID を保持 */
  const [videos, setVideos] = useState<VideoMap>({});

  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);

  /* ---------- 1. Firestore 読み込み ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const snap = await getDocs(
        query(
          collection(db, "users", user.uid, "mistakes"),
          orderBy("timestamp", "desc")
        )
      );

      const tbl: Record<string, Record<string, Mistake[]>> = {};
      snap.docs.forEach((d) => {
        const m = d.data() as Mistake;
        if (!m.subject || !m.topic) return;
        tbl[m.subject] ??= {};
        tbl[m.subject][m.topic] ??= [];
        tbl[m.subject][m.topic].push(m);
      });

      setGrouped(tbl);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ---------- 2. grouped 完成後に動画を取得 ---------- */
  useEffect(() => {
    if (Object.keys(grouped).length === 0) return; // 誤答ゼロなら何もしない

    (async () => {
      const map: VideoMap = {};

      for (const [sbj, tpMap] of Object.entries(grouped)) {
        map[sbj] = {};

        for (const tp of Object.keys(tpMap)) {
          /* Mistake 配列の 1 件目から grade / term を取得（代表値） */
          const { grade = "", term = "" } = tpMap[tp][0] ?? {};

          try {
            const res = await fetch("/api/youtube-recommend", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subject: sbj, topic: tp, grade, term }),
            });
            const { videoId } = (await res.json()) as {
              videoId?: string | null;
            };
            map[sbj][tp] = videoId ?? null;
          } catch {
            map[sbj][tp] = null;
          }
        }
      }
      setVideos(map);
    })();
  }, [grouped]);

  /* ---------- Loading ---------- */
  if (loading) return <p className="p-6 text-center">読み込み中...</p>;

  const subjects = Object.keys(grouped);

  /* ---------- JSX ---------- */
return (
  <main className="max-w-4xl mx-auto p-6 space-y-8">
    <h1 className="text-2xl font-bold">🔁 復習一覧（教科・単元別）</h1>

    {subjects.length === 0 ? (
      <p className="text-gray-600">間違えた問題はまだありません。</p>
    ) : (
      <div className="space-y-4">
        {subjects.map((sbj) => (
          <div key={sbj} className="bg-white rounded shadow">
            {/* ===== 教科ヘッダー（div に変更） ===== */}
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                setOpenKey(openKey?.startsWith(sbj) ? null : `${sbj}::all`)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                setOpenKey(openKey?.startsWith(sbj) ? null : `${sbj}::all`)
              }
              className="w-full p-4 flex justify-between items-center text-left hover:bg-gray-50 rounded-t cursor-pointer"
            >
              <span className="text-lg font-semibold">{sbj}</span>
              <span className="text-xl">
                {openKey?.startsWith(sbj) ? "▲" : "▼"}
              </span>
            </div>

            {/* ===== 教科展開 ===== */}
            {openKey?.startsWith(sbj) && (
              <div className="border-t">
                {Object.entries(grouped[sbj]).map(([tp, list]) => {
                  const key  = `${sbj}::${tp}`;
                  const open = openKey === key;
                  const vId  = videos[sbj]?.[tp] ?? null;

                  return (
                    <div key={tp}>
                      {/* -- 単元ヘッダー（div に変更） -- */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpenKey(open ? `${sbj}::all` : key)}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          setOpenKey(open ? `${sbj}::all` : key)
                        }
                        className="w-full px-6 py-3 flex justify-between items-center text-left hover:bg-gray-50 cursor-pointer"
                      >
                        <span className="text-sm">{tp}</span>

                        <span className="flex items-center gap-3">
                          {/* 再挑戦ボタン（本物の <button> はここだけ） */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // 折りたたみ開閉をキャンセル
                              const { grade, term } = list[0]; // 代表値
                              router.push(
                                `/retry?grade=${encodeURIComponent(grade)}` +
                                  `&term=${encodeURIComponent(term)}` +
                                  `&subject=${encodeURIComponent(sbj)}` +
                                  `&topic=${encodeURIComponent(tp)}`
                              );
                            }}
                            className="text-xs bg-green-500 hover:bg-green-600 text-white rounded px-2 py-1"
                          >
                            再挑戦
                          </button>

                          <span className="text-xs text-gray-500">
                            × {list.length}
                          </span>

                          {vId && (
                            <img
                              src={`https://img.youtube.com/vi/${vId}/default.jpg`}
                              alt=""
                              className="w-10 h-7 object-cover rounded"
                            />
                          )}
                        </span>
                      </div>

                      {/* -- 単元詳細 -- */}
                      {open && (
                        <div className="px-8 py-3 space-y-4 bg-gray-50">
                          {vId && (
                            <div className="aspect-video w-full">
                              <iframe
                                className="w-full h-full rounded"
                                src={`https://www.youtube.com/embed/${vId}`}
                                title="解説動画"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}

                          <ul className="space-y-3">
                            {list.map((m, i) => (
                              <li key={i} className="bg-white p-4 rounded shadow-sm">
                                <p className="font-semibold">❓ {m.question}</p>
                                <p className="text-red-600">あなた: {m.selected}</p>
                                <p className="text-green-600">正解: {m.correct}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {m.timestamp &&
                                    new Date(
                                      m.timestamp.seconds * 1000
                                    ).toLocaleString()}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    )}

    <button
      onClick={() => router.back()}
      className="mt-6 bg-blue-600 text-white px-6 py-2 rounded"
    >
      ← 戻る
    </button>
  </main>
);

}
