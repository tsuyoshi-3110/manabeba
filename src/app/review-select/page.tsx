"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/* ───── 型 ───── */
type Mistake = {
  question : string;
  correct  : string;
  selected : string;
  subject  : string;
  topic    : string;
  grade    : string;
  term     : string;
  timestamp?: { seconds: number };
};

export default function ReviewTopicPage() {
  const sp      = useSearchParams();
  const router  = useRouter();
  const subject = sp.get("subject") ?? "";
  const topic   = sp.get("topic")   ?? "";

  const [list,   setList  ] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);

  /* Firestore で該当ミス取得 */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setLoading(false); return; }

      const snap = await getDocs(
        query(
          collection(db, "users", u.uid, "mistakes"),
          where("subject", "==", subject),
          where("topic",   "==", topic),
          orderBy("timestamp", "desc")
        )
      );
      setList(snap.docs.map((d) => d.data() as Mistake));
      setLoading(false);
    });
    return () => unsub();
  }, [subject, topic]);

  if (loading) return <p className="p-6 text-center">読み込み中...</p>;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">
        🔁 復習：{subject} ／ {topic}
      </h1>

      {list.length === 0 ? (
        <p className="text-gray-600">この単元の誤答はありません。</p>
      ) : (
        <ul className="space-y-4">
          {list.map((m, i) => (
            <li key={i} className="bg-white rounded shadow p-4">
              <p className="font-semibold">❓ {m.question}</p>
              <p className="text-red-600">あなた: {m.selected}</p>
              <p className="text-green-600">正解: {m.correct}</p>
              <p className="text-xs text-gray-400 mt-1">
                {m.timestamp &&
                  new Date(m.timestamp.seconds * 1000).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
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
