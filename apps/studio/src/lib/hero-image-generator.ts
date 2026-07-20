import { INDUSTRY_TYPES, type DesignVariant } from '@sokko/shared';

/**
 * ヒーロー画像のAI生成（③ユーザビリティテストの宿題）。
 * Gemini（gemini-2.5-flash-image）で業種・デザイン・テーマカラーに合う
 * 抽象背景を生成する。文字・実在人物は入れない（誤字画像・肖像リスクの回避）。
 *
 * 必要な環境変数: GEMINI_API_KEY（未設定時はStep4のボタン自体が出ない）
 * 生成結果はdataURLで返し、クライアント側が通常のアップロードと同じ経路
 * （WebP変換→縮小版生成→ストレージ保存）に流す＝新しい配信経路を作らない。
 */

const MODEL = process.env.SOKKO_IMAGE_MODEL ?? 'gemini-2.5-flash-image';

const STYLE_BY_VARIANT: Record<DesignVariant, string> = {
  classic:
    '落ち着いた上質な抽象的背景。和紙のような質感、柔らかな斜光、深い色調のグラデーション。高級感と信頼感',
  future:
    '深い紺色の背景に、発光する粒子と幾何学的な回路のラインが漂う抽象的なテクノロジー背景。近未来的で洗練された印象',
  warm: '温かみのある柔らかな色彩の抽象的背景。丸みのある形、穏やかなグラデーション、朝の光のような優しい明るさ',
};

export async function generateHeroImage(input: {
  variant: DesignVariant;
  mainColor: string;
  industryLabel?: string;
  industryType: keyof typeof INDUSTRY_TYPES;
  businessSummary: string;
}): Promise<{ dataUrl: string } | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: '画像生成のAPIキーが未設定です（システム管理者にご相談ください）' };
  }

  const industry = input.industryLabel ?? INDUSTRY_TYPES[input.industryType];
  const prompt = `ホームページのメインビジュアル用の横長背景画像を1枚生成してください。

スタイル: ${STYLE_BY_VARIANT[input.variant]}
テーマカラー: ${input.mainColor} を基調に、調和する色だけを使う
業種の雰囲気: ${industry}（${input.businessSummary}）のサイトにふさわしい世界観

厳守事項:
- 文字・ロゴ・数字・記号は一切入れない
- 人物（実在に見える顔）は入れない
- 上に白い文字を重ねて読めるよう、全体的に落ち着いたコントラストにする`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { imageConfig: { aspectRatio: '16:9' } },
        }),
      },
    );
    if (!res.ok) {
      console.error('gemini image api error:', res.status, await res.text());
      return { error: `画像生成に失敗しました（API ${res.status}）。もう一度お試しください` };
    }
    const data = (await res.json()) as {
      candidates?: {
        content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] };
      }[];
    };
    const image = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
      ?.inlineData;
    if (!image?.data) {
      return { error: '画像が生成されませんでした。もう一度お試しください' };
    }
    return {
      dataUrl: `data:${image.mimeType ?? 'image/png'};base64,${image.data}`,
    };
  } catch (err) {
    console.error('generateHeroImage failed:', err);
    return { error: '画像生成に失敗しました。もう一度お試しください' };
  }
}
