/**
 * 構造化出力用JSON Schema（Claude API output_config.format）。
 * 応答の検証は @sokko/shared のzodスキーマ（v3）で行い、
 * ここは「モデルに出力形式を強制する」ためだけの定義。
 * shared側のスキーマを変更したら必ずここも追随させること。
 */

const SECTION_TYPES = [
  'hero',
  'services',
  'pricing',
  'profile',
  'testimonials',
  'access',
  'contact',
  'faq',
  'news',
  'richtext',
  'cta',
];

const sectionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['type'],
  properties: {
    type: { type: 'string', enum: SECTION_TYPES },
    heading: { type: 'string' },
    body: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title'],
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          meta: { type: 'string' },
        },
      },
    },
  },
};

export const PAGE_CONTENT_FORMAT = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'description', 'sections'],
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      sections: { type: 'array', items: sectionJsonSchema },
    },
  },
};

export const SITE_META_FORMAT = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['llmsSummary', 'faq'],
    properties: {
      llmsSummary: { type: 'string' },
      faq: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'answer'],
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
          },
        },
      },
    },
  },
};

export const CRITIQUE_FORMAT = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['passed', 'issues'],
    properties: {
      passed: { type: 'boolean' },
      issues: {
        type: 'array',
        items: { type: 'string' },
        description: '修正が必要な指摘。passed=trueなら空配列',
      },
    },
  },
};
