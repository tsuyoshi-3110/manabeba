"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ---------------- 選択肢 ----------------- */
const grades = ["中学1年生", "中学2年生", "中学3年生"];
const subjects = ["数学", "英語", "理科", "社会", "国語"];
const terms = ["1学期", "2学期", "3学期"];

/* 学期 × 教科 → 単元リスト */
const TOPICS: Record<string, Record<string, string[]>> = {
  /* 数学 -------------------------------------------------- */
  数学: {
    "1学期": [
      "正の数と負の数",
      "文字と式（導入）",
      "一次方程式（基本）",
      "平面図形の基礎",
      "資料の活用（導入）",
    ],
    "2学期": ["文字式の計算", "連立方程式", "比例・反比例"],
    "3学期": ["空間図形（柱・錐）", "データの分析 基礎"],
  },

  /* 英語 -------------------------------------------------- */
  英語: {
    "1学期": ["be動詞と一般動詞", "命令文・疑問文", "三人称単数現在形"],
    "2学期": ["現在進行形", "助動詞 can / must", "過去形（導入）"],
    "3学期": ["過去形の発展", "未来表現 be going to / will", "比較級・最上級"],
  },

  /* 理科 -------------------------------------------------- */
  理科: {
    "1学期": ["植物の分類", "身の回りの物質", "光と音"],
    "2学期": ["化学変化の基礎", "大気と水", "力の働き"],
    "3学期": ["地層と時間", "生物の観察まとめ"],
  },

  /* 社会 -------------------------------------------------- */
  社会: {
    "1学期": ["世界の姿と地域構成", "日本の領土と領海", "世界各地の生活文化"],
    "2学期": ["古代日本の成立", "奈良・平安の政治と文化", "鎌倉幕府と武家社会"],
    "3学期": ["室町〜安土桃山時代", "江戸幕府の成立と鎖国", "近世の産業と文化"],
  },

  /* 国語 -------------------------------------------------- */
  国語: {
    "1学期": [
      "物語文の読解（心情と構成）",
      "短歌・俳句の基礎",
      "漢字の成り立ちと部首",
    ],
    "2学期": ["説明文の構造", "敬語と文法基礎", "作文・意見文の書き方"],
    "3学期": [
      "古文の言葉とリズム",
      "話し合い活動と要約",
      "語彙力アップ・漢字総復習",
    ],
  },
};

export default function SelectPage() {
  /* ───── state ───── */
  const [grade, setGrade] = useState("");
  const [term, setTerm] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");

  const router = useRouter();

  /* 選択中教科+学期から単元リストを取得 */
  const topicList = useMemo(
    () => (subject && term ? TOPICS[subject]?.[term] ?? [] : []),
    [subject, term]
  );

  /* クエリ生成して遷移 */
  const handleNext = () => {
    const qs = new URLSearchParams({
      grade,
      term,
      subject,
      topic,
    }).toString();
    router.push(`/quiz?${qs}`);
  };

  /* ───── JSX ───── */
  return (
    <main className="p-6 max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-center">
        あなたの興味を教えてください
      </h1>

      {/* 学年 */}
      <section>
        <h2 className="font-semibold mb-1">📘 学年</h2>
        {grades.map((g) => (
          <label key={g} className="mr-4">
            <input
              type="radio"
              name="grade"
              checked={grade === g}
              onChange={() => setGrade(g)}
            />{" "}
            {g}
          </label>
        ))}
      </section>

      {/* 学期 */}
      <section>
        <h2 className="font-semibold mb-1">📅 学期</h2>
        {terms.map((t) => (
          <label key={t} className="mr-4">
            <input
              type="radio"
              name="term"
              checked={term === t}
              onChange={() => {
                setTerm(t);
                setTopic(""); // term 変更で topic リセット
              }}
            />{" "}
            {t}
          </label>
        ))}
      </section>

      {/* 教科（単一選択ボタン） */}
      <section>
        <h2 className="font-semibold mb-1">📚 教科</h2>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSubject(s);
                setTopic(""); // 教科変更で topic リセット
              }}
              className={`px-3 py-1 border rounded ${
                subject === s ? "bg-blue-600 text-white" : ""
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* 単元（選択肢がある場合のみ） */}
      {topicList.length > 0 && (
        <section>
          <h2 className="font-semibold mb-1">🗂️ 単元</h2>
          <div className="flex flex-wrap gap-2">
            {topicList.map((tp: string) => (
              <button
                key={tp}
                onClick={() => setTopic(tp)}
                className={`px-3 py-1 border rounded text-sm ${
                  topic === tp ? "bg-green-600 text-white" : ""
                }`}
              >
                {tp}
              </button>
            ))}
          </div>
        </section>
      )}

      <button
        disabled={!grade || !term || !subject || !topic}
        onClick={handleNext}
        className="w-full py-2 rounded text-white disabled:bg-gray-400 bg-blue-600"
      >
        次へ
      </button>
    </main>
  );
}
