import {
  INDUSTRY_PRESETS,
  PAGE_BLUEPRINTS,
  pageLabelFor,
  PROHIBITED_EXPRESSIONS,
  type PageKey,
  type ProjectInput,
} from '@sokko/shared';

/**
 * 生成プロンプトの型（再現性＞自由度）。
 * 構造はテンプレ（PAGE_BLUEPRINTS）が決め、AIは文章に専念する。
 * オペレーターに自由記述プロンプトは露出しない。
 */

export function workerSystemPrompt(input: ProjectInput): string {
  const preset = INDUSTRY_PRESETS[input.basics.industryType];
  return `あなたは${preset.writerRole}専門のWebコピーライターです。
中小事業者のWebサイトの文章を書きます。

守るべき原則:
- トーンは「${input.mood.tone}」。派手さより実直（読者の信頼を得ることが核）。
- この事業者"固有"の文章を書く。どの事業者にも当てはまる汎用の埋め草は書かない。入力情報の固有名詞・数字・エピソードを活かす。
- AEO: 検索されそうな言葉（${input.target.searchKeywords.join('、')}）と商圏（${input.aeo.serviceAreaCities.join('、')}）を、不自然にならない範囲で本文に織り込む。
- ポジショニング「${input.aeo.positioningStatement}」の趣旨を要所に反映する。
- 広告規制: 誇大・断定・比較優良表現は禁止。特に次の表現は使わない: ${PROHIBITED_EXPRESSIONS.join('、')}。事実ベースで書く。
- 入力に無い実績・数字・事例を捏造しない。
- 文章は日本語。専門用語には短い説明を添える（読者は経営者や一般の依頼者）。`;
}

export function pagePrompt(input: ProjectInput, pageKey: Exclude<PageKey, 'news'>): string {
  const blueprint = PAGE_BLUEPRINTS[pageKey];
  return `以下の事業者情報をもとに、「${pageLabelFor(input.basics.industryType, pageKey)}」ページの文章を生成してください。

## ページの目的
${blueprint.purpose}

## 使用するセクション（この順番・この構成で）
${blueprint.sections.join(' → ')}

## セクション種別ごとの書き方
- hero: heading=読者の悩みに刺さる主見出し（30字前後）、body=事務所の価値を伝えるリード文（100字前後）
- services: heading=見出し、items=業務ごとに {title, body}（bodyは2〜3文で具体的に）
- pricing: heading=見出し、items=料金項目ごとに {title, body=補足, meta=価格（例: 月額 30,000円〜）}
- profile: heading=見出し、body=代表の経歴・人柄・依頼者への想い（200〜300字、改行可）
- testimonials: heading=見出し、items=事例ごとに {title=依頼者属性, body=声または相談例と対応, meta=補足}
- access: heading=見出し、body=最寄り駅からの道案内・駐車場情報（入力の所在地から妥当な範囲で）
- contact: heading=見出し、body=相談のハードルを下げる案内文（2〜3文）
- richtext: heading=見出し、body=自由本文（改行可）
- faq: セクションは {type:"faq"} のみ出力（中身はサイト共通FAQが自動挿入される）
- cta: heading=行動を促す短い見出し、body=一言（任意）

## 事業者情報（①ヒアリング入力）
${JSON.stringify(input, null, 2)}

titleはSEOタイトル（「ページ内容｜事務所名」形式、35字以内）、descriptionはメタディスクリプション（80〜120字、検索語を自然に含める）。`;
}

export function metaPrompt(input: ProjectInput): string {
  return `以下の事業者情報をもとに、サイト全体のメタ情報を生成してください。

1. llmsSummary: AI回答エンジン（ChatGPT等）がこの事業者を引用・推薦しやすいサイト要約（2〜3文。何者で・どこで・何をするか・強みを明快に）。
2. faq: 見込み客が実際に検索・質問しそうなFAQを4〜5件。answerは2〜3文で具体的に。料金・初回相談・対応エリア・依頼の流れなど。

## 事業者情報（①ヒアリング入力）
${JSON.stringify(input, null, 2)}`;
}

/** 司令塔（Fable 5）の自己批評観点（§11） */
export function criticSystemPrompt(): string {
  return `あなたは中小事業者向けWebサイト制作の品質管理責任者です。ワーカーAIが生成したページ文章をレビューします。

レビュー観点（すべて満たしたら合格）:
1. 固有性: この事業者"固有"の内容か。どの事業者にも使い回せる汎用文章（AI slop）になっていないか。
2. AEOポジショニング: 指定のポジショニング一文の趣旨と検索語が自然に織り込まれているか。
3. トーン: 業種にふさわしい信頼感のあるトーンか。指定トーンに合っているか。
4. 広告規制: 誇大・断定・比較優良・捏造（入力に無い実績や数字）がないか。

軽微な文言の好みは指摘しない。修正が必要な問題だけを、ワーカーがそのまま直せる具体性で指摘する。`;
}

export function critiquePrompt(
  input: ProjectInput,
  pageLabel: string,
  generatedJson: string,
): string {
  return `以下は「${pageLabel}」ページとして生成された文章です。レビュー観点に照らして評価してください。

## 事業者情報（①ヒアリング入力）
${JSON.stringify(input, null, 2)}

## 生成された文章
${generatedJson}`;
}

export function revisePrompt(originalJson: string, issues: string[]): string {
  return `先ほど生成した文章に、品質管理責任者から以下の指摘がありました。指摘をすべて反映して、同じJSON構造で全体を出力し直してください。指摘のない部分は変えないでください。

## 指摘
${issues.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## 元の文章
${originalJson}`;
}
