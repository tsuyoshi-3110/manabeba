import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/* ── 型定義 ─────────────────────────── */
interface QuizRequest {
  grade : string;     // 例: "中学1年生"
  subject: string;    // 例: "数学"
  term  : string;     // 例: "1学期"
  topic?: string;     // 例: "正負の数"（任意）
}

interface QuizResponse {
  question: string;
  options : string[]; // 2〜4 個
  answer  : string;
}

/* ── OpenAI 初期化 ──────────────────── */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* ── API Route ──────────────────────── */
export async function POST(req: NextRequest) {
  try {
    /* ① リクエスト取得 */
    const { grade, subject, term, topic } =
      (await req.json()) as QuizRequest;

    /* ② Prompt 生成 */
    const topicLine = topic ? `- 単元: ${topic}\n` : "";
    const prompt = `以下の条件で中学生向け四択クイズを１問作成してください。
- 学年: ${grade}
- 教科: ${subject}
- 学期: ${term}
${topicLine}
【JSON 形式のみで出力】
{
  "question": "問題文",
  "options": ["A","B","C","D"],
  "answer": "正解の文字列"
}`;

    /* ③ GPT 呼び出し（JSON モード） */
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",          // 必要に応じ gpt-3.5-turbo など
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    /* ④ パース & 簡易チェック */
    const raw   = chat.choices[0]?.message?.content ?? "{}";
    const quiz  = JSON.parse(raw) as QuizResponse;

    if (
      !quiz.question ||
      !Array.isArray(quiz.options) ||
      quiz.options.length < 2 ||
      !quiz.answer
    ) {
      throw new Error("Invalid quiz JSON");
    }

    /* ⑤ 成功レスポンス */
    return NextResponse.json(quiz);
  } catch (e) {
    console.error("Quiz API error:", e);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
