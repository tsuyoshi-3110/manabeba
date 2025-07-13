import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.YOUTUBE_API_KEY!;
const YT_SEARCH_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/search" +
  "?part=snippet&type=video&maxResults=1&videoEmbeddable=true"; // ★ 埋め込み可のみ

/* ─── 返却型（最小） ─── */
interface YouTubeSearchResponse {
  items: { id: { videoId?: string } }[];
}

/* ─── API Route ───────── */
export async function POST(req: NextRequest) {
  try {
    /* ① パラメータ取得 */
    const { grade, term, subject, topic } = (await req.json()) as {
      grade: string;
      term: string;
      subject: string;
      topic?: string;
    };

    /* ② 検索クエリ生成 */
    const q = encodeURIComponent(
      `${grade} ${term} ${subject} ${topic ?? ""} 解説`
    );
    const url = `${YT_SEARCH_ENDPOINT}&q=${q}&key=${API_KEY}`;

    /* ③ YouTube API 呼び出し */
    const res = await fetch(url);
    if (!res.ok) {
      console.error("YouTube API error", res.status, await res.text());
      return NextResponse.json(
        { videoId: null },
        { status: 500 }
      );
    }

    /* ④ videoId 抽出 */
    const data = (await res.json()) as YouTubeSearchResponse;
    const videoId = data.items?.[0]?.id.videoId ?? null;

    return NextResponse.json({ videoId });
  } catch (e) {
    console.error("youtube-recommend error:", e);
    return NextResponse.json({ videoId: null }, { status: 500 });
  }
}
