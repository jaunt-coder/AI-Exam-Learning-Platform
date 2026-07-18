/**
 * MVP Data Cleaner — 표시용 텍스트 정제 레이어
 * DB JSON(question-db-mvp.json)은 수정하지 않음.
 */

import { QUESTION_CLEANUP_OVERRIDES } from './question-cleanup-overrides.js';

const FOOTER_PATTERNS = [
  /\n?\s*A-\d{2}-\d{1,2}(?:-\[\d교시\])?\s*/gi,
  /\n?\s*A-\d{2}-\d{1,2}-\[\d교시\]\s*/gi,
  /\n?\s*교시\s*-\[\s*\d\s*\]\s*/gi,
  /\n?\s*한국산업[^\n]*/gi,
  /\n?\s*page\s*\(\s*\d+\s*\)\s*/gi,
  /\n?\s*제\d+회[^\n]*/gi,
  /\n?\s*청렴한감정평가[^\n]*/gi,
  /\n?\s*\d{4}년\s*제\d+회[^\n]*A-\d{2}-\d{1,2}\s*/gi,
];

const CHOICE_SYMBOLS = /[①②③④⑤]/g;
const EXCESS_NEWLINES = /\n{3,}/g;
const NUMBER_TOKEN = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;
const CURRENCY_TOKEN = /W\d{1,3}(?:,\d{3})+(?:\.\d+)?/gi;

function makeTokenPlaceholder(index) {
  return `@@N${String.fromCharCode(0xe000 + index)}@@`;
}

function protectNumericTokens(text) {
  const tokens = [];
  let value = text.replace(CURRENCY_TOKEN, (match) => {
    tokens.push(match.replace(/\s+/g, ''));
    return makeTokenPlaceholder(tokens.length - 1);
  });
  value = value.replace(NUMBER_TOKEN, (match) => {
    tokens.push(match.replace(/\s+/g, ''));
    return makeTokenPlaceholder(tokens.length - 1);
  });
  return { value, tokens };
}

function restoreNumericTokens(text, tokens) {
  return tokens.reduce((current, token, index) => {
    const placeholder = makeTokenPlaceholder(index);
    return current.split(placeholder).join(token);
  }, text);
}

/**
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function removeOcrFooter(text) {
  if (text == null) return '';
  let value = String(text);
  for (const pattern of FOOTER_PATTERNS) {
    value = value.replace(pattern, '');
  }
  return value.trim();
}

/**
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function removePageNumbers(text) {
  return removeOcrFooter(text);
}

/**
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function removeChoiceEndNoise(text) {
  if (text == null) return '';
  let value = removeOcrFooter(String(text));
  value = value.replace(/\s+A-\d{2}-\d{1,2}.*$/i, '');
  value = value.replace(/\s+교시\s*-\[\s*\d\s*\]\s*$/i, '');
  return value.trim();
}

/**
 * @param {string|null|undefined} text
 * @param {{ preserveParagraphs?: boolean }} [options]
 * @returns {string}
 */
export function fixOcrSpacing(text, options = {}) {
  if (text == null) return '';
  let value = String(text).replace(/\uFFFD/g, '').replace(/\u0000/g, '');
  value = value.replace(/\uFFE6/g, 'W').replace(/￦/g, 'W');

  if (options.preserveParagraphs) {
    value = value.replace(EXCESS_NEWLINES, '\n\n');
    value = value
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .join('\n');
  } else {
    value = value.replace(/\s*\n+\s*/g, ' ');
    value = value.replace(/\s{2,}/g, ' ');
  }

  const protectedTokens = protectNumericTokens(value);
  value = protectedTokens.value;

  value = value.replace(/([.?;:])([가-힣A-Za-z0-9])/g, '$1 $2');
  value = value.replace(/,([가-힣])/g, ', $1');
  value = value.replace(/([가-힣0-9])(\()/g, '$1 $2');
  value = value.replace(/(\))([가-힣A-Za-z0-9])/g, '$1 $2');
  value = value.replace(/([가-힣])(W\d)/g, '$1 $2');
  value = value.replace(/([가-힣])(\d)/g, '$1 $2');
  value = value.replace(/(\d)([가-힣])/g, '$1 $2');
  value = value.replace(/(\d)(W)/g, '$1 $2');
  value = value.replace(/\(\s+/g, '(');
  value = value.replace(/\s+\)/g, ')');
  value = value.replace(/\s{2,}/g, ' ');
  value = restoreNumericTokens(value, protectedTokens.tokens);

  return value.trim();
}

/**
 * @param {string|null|undefined} text
 * @param {{ field?: string, preserveParagraphs?: boolean }} [options]
 * @returns {string}
 */
export function cleanDisplayText(text, options = {}) {
  if (text == null) return '';
  const field = options.field || 'text';
  let value = String(text);

  value = removeOcrFooter(value);
  value = value.replace(CHOICE_SYMBOLS, '');

  if (field.startsWith('choices')) {
    value = removeChoiceEndNoise(value);
  }

  value = fixOcrSpacing(value, {
    preserveParagraphs: options.preserveParagraphs || field === 'originalQuestion',
  });

  return value.trim();
}

/**
 * @param {object} question
 * @returns {object}
 */
export function cleanQuestionForDisplay(question) {
  if (!question || typeof question !== 'object') return question;

  const override = QUESTION_CLEANUP_OVERRIDES[question.questionId];
  const cleaned = { ...question };

  if (override?.question) {
    cleaned.question = override.question;
  } else {
    cleaned.question = cleanDisplayText(question.question, { field: 'question' });
  }

  if (override?.originalQuestion !== undefined) {
    cleaned.originalQuestion = override.originalQuestion;
  } else if (override?.question) {
    cleaned.originalQuestion = override.table
      ? `${override.question}\n${override.table}`
      : override.question;
  } else {
    cleaned.originalQuestion = cleanDisplayText(question.originalQuestion, {
      field: 'originalQuestion',
      preserveParagraphs: true,
    });
  }

  if (override && 'table' in override) {
    cleaned.table = override.table;
  } else if (question.table) {
    cleaned.table = cleanDisplayText(question.table, { field: 'table' });
  }

  if (Array.isArray(question.choices)) {
    cleaned.choices = question.choices.map((choice, index) =>
      cleanDisplayText(choice, { field: `choices[${index + 1}]` }),
    );
  }

  cleaned._displayCleaned = true;
  return cleaned;
}

/**
 * @param {array} questions
 * @returns {array}
 */
export function applyQuestionCleanup(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map((question) => cleanQuestionForDisplay(question));
}

/**
 * @param {object} question
 * @returns {boolean}
 */
export function hasFooterNoise(text) {
  if (!text) return false;
  const sample = String(text);
  return FOOTER_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(sample);
  });
}

export { FOOTER_PATTERNS, QUESTION_CLEANUP_OVERRIDES };
