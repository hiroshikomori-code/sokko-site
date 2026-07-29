import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

/**
 * クライアント提供資料のテキスト抽出。
 * - Excel（xlsx/xls）: SheetJSでシートごとにCSV化（表構造を保つ）
 * - Word（docx）: mammothで本文抽出
 * - PDF: ClaudeのPDF入力で本文抽出（スキャンPDFもOCR相当で読める）
 * - テキスト/CSV: そのまま
 * 元ファイルは保存しない方針のため、ここで抽出したテキストが唯一の保存物になる。
 */

const PDF_MODEL = process.env.SOKKO_POLISH_MODEL ?? 'claude-sonnet-5';
/** 1資料あたりの保存上限（DB肥大とプロンプト暴走の防止） */
export const MAX_CHARS_PER_DOC = 50_000;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = [
  'xlsx',
  'xls',
  'docx',
  'pdf',
  'txt',
  'csv',
  'md',
] as const;

export async function extractDocumentText(
  filename: string,
  mimeType: string,
  buffer: Buffer,
): Promise<{ text: string } | { error: string }> {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  try {
    if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const parts: string[] = [];
      for (const name of wb.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]).trim();
        if (csv) parts.push(`【シート: ${name}】\n${csv}`);
      }
      const text = parts.join('\n\n');
      if (!text) return { error: 'Excelから文字を読み取れませんでした（空のシート？）' };
      return { text: text.slice(0, MAX_CHARS_PER_DOC) };
    }

    if (ext === 'docx') {
      const { value } = await mammoth.extractRawText({ buffer });
      const text = value.trim();
      if (!text) return { error: 'Wordから文字を読み取れませんでした' };
      return { text: text.slice(0, MAX_CHARS_PER_DOC) };
    }

    if (ext === 'pdf') {
      return await extractPdfWithClaude(buffer);
    }

    if (ext === 'txt' || ext === 'csv' || ext === 'md') {
      const text = buffer.toString('utf-8').trim();
      if (!text) return { error: 'ファイルが空です' };
      return { text: text.slice(0, MAX_CHARS_PER_DOC) };
    }

    return {
      error: `この形式（.${ext}）は未対応です。対応形式: Excel / Word / PDF / テキスト / CSV`,
    };
  } catch (err) {
    console.error(`extractDocumentText failed (${filename}, ${mimeType}):`, err);
    return { error: 'ファイルの読み取りに失敗しました。形式をご確認ください' };
  }
}

/** PDFはClaudeに読ませて本文抽出（テキストPDFもスキャンPDFも同じ経路で扱える） */
async function extractPdfWithClaude(
  buffer: Buffer,
): Promise<{ text: string } | { error: string }> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: PDF_MODEL,
    max_tokens: 16_000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: buffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: 'このPDFの本文テキストを抽出してください。見出しや表の構造はなるべく保ち、装飾やページ番号は省いてください。出力は抽出テキストのみ（前置き・説明なし）。',
          },
        ],
      },
    ],
  });
  const block = response.content.find((b) => b.type === 'text');
  const text =
    block && 'text' in block && typeof block.text === 'string'
      ? block.text.trim()
      : '';
  if (!text) return { error: 'PDFから文字を読み取れませんでした' };
  return { text: text.slice(0, MAX_CHARS_PER_DOC) };
}
