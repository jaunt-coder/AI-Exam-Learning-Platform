/**
 * MVP Data Cleaner — Display Cleanup Layer
 * DB JSON(question-db-mvp.json)은 수정하지 않음.
 * data-loader.js가 MVP 로드 시 메모리에만 적용 → Question/Tutor/Recommendation/Analytics 공통.
 */

import {
  ACCOUNTING_PREFIXES,
  ACCOUNTING_TERMS_SORTED,
} from './accounting-term-dictionary.js';
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
const FORMATTED_NUMBER = /\d{1,3}(?:,\d{3})+(?:\.\d+)?/g;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeTokenPlaceholder(index) {
  return `@@N${String.fromCharCode(0xe000 + index)}@@`;
}

function protectNumericTokens(text) {
  const tokens = [];
  let value = text;

  const protect = (match) => {
    tokens.push(match.replace(/\s+/g, ''));
    return makeTokenPlaceholder(tokens.length - 1);
  };

  value = value.replace(/W\d{1,3}(?:,\d{3})+(?:\.\d+)?/gi, protect);
  value = value.replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/g, protect);
  value = value.replace(/20[×xX]\d{1,2}/g, protect);

  return { value, tokens };
}

function restoreNumericTokens(text, tokens) {
  return tokens.reduce((current, token, index) => {
    const placeholder = makeTokenPlaceholder(index);
    return current.split(placeholder).join(token);
  }, text);
}

function addCommas(integerPart) {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatNumberToken(raw) {
  const normalized = String(raw).replace(/\s+/g, '');
  if (!normalized || normalized.includes(',')) {
    return normalized;
  }
  if (/^20[×xX]\d{1,2}$/.test(normalized)) {
    return normalized.replace(/[xX]/, '×');
  }
  const match = normalized.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    return normalized;
  }
  const [, integerPart, decimalPart] = match;
  if (integerPart.length < 4 && !decimalPart) {
    return normalized;
  }
  const formatted = addCommas(integerPart);
  return decimalPart != null ? `${formatted}.${decimalPart}` : formatted;
}

/**
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function formatDisplayNumbers(text) {
  if (text == null) return '';
  let value = String(text);

  const protectedYears = [];
  value = value.replace(/20[×xX]\d{1,2}/g, (match) => {
    protectedYears.push(match.replace(/[xX]/, '×'));
    return makeTokenPlaceholder(protectedYears.length - 1);
  });

  value = value.replace(/W(\d[\d,]*(?:\.\d+)?)/gi, (_, amount) => {
    const cleaned = amount.replace(/,/g, '');
    return `W${formatNumberToken(cleaned)}`;
  });

  value = value.replace(/(\d[\d,]*(?:\.\d+)?)(?=원|천원|백만원|억원)/g, (match) => {
    const cleaned = match.replace(/,/g, '');
    return formatNumberToken(cleaned);
  });

  value = value.replace(/\b(\d{4,})(?!\d|,|\.)/g, (match) => formatNumberToken(match));

  value = protectedYears.reduce((current, token, index) => {
    return current.split(makeTokenPlaceholder(index)).join(token);
  }, value);

  return value;
}

/**
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function applyAccountingTermSpacing(text) {
  if (text == null) return '';
  const protectedTokens = protectNumericTokens(String(text));
  let value = protectedTokens.value;

  for (const term of ACCOUNTING_TERMS_SORTED) {
    if (term.length < 2) continue;
    const escaped = escapeRegExp(term);
    value = value.replace(new RegExp(`(?<!\\s)(?<=[가-힣])(${escaped})`, 'g'), ' $1');
  }

  for (const prefix of ACCOUNTING_PREFIXES) {
    if (prefix.length < 2) continue;
    const escaped = escapeRegExp(prefix);
    value = value.replace(new RegExp(`(?<=[가-힣])(${escaped})(?=[가-힣])`, 'g'), ' $1 ');
  }

  value = value.replace(/\s{2,}/g, ' ');
  return restoreNumericTokens(value, protectedTokens.tokens);
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

/** @deprecated removeOcrFooter alias */
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
  value = value.replace(/(\d)([가-힣])/g, (match, digit, hangul, index, source) => {
    const tail = source.slice(index + digit.length);
    if (/^원(?:$|[^가-힣])/.test(tail) || /^천원|^백만원|^억원/.test(tail) || hangul === '㎡' || hangul === '%') {
      return match;
    }
    return `${digit} ${hangul}`;
  });
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
  if (field !== 'table') {
    value = value.replace(CHOICE_SYMBOLS, '');
  }

  if (field.startsWith('choices')) {
    value = removeChoiceEndNoise(value);
  }

  value = fixOcrSpacing(value, {
    preserveParagraphs: options.preserveParagraphs || field === 'originalQuestion' || field === 'table',
  });
  value = formatDisplayNumbers(value);
  value = applyAccountingTermSpacing(value);

  return value.trim();
}

/**
 * @param {string|null|undefined} text
 * @returns {{ longestGlued: number, spaceRatio: number, unformattedNumbers: number }}
 */
export function measureReadability(text) {
  if (!text) {
    return { longestGlued: 0, spaceRatio: 0, unformattedNumbers: 0 };
  }
  const sample = String(text);
  const hangulOnly = sample.replace(/[^\uAC00-\uD7A3\s]/g, '');
  const hangulTokens = sample
    .split(/\s+/)
    .map((token) => token.replace(/[^\uAC00-\uD7A3]/g, ''))
    .filter(Boolean);
  const longestGlued = hangulTokens.reduce((max, token) => Math.max(max, token.length), 0);
  const hangulChars = hangulOnly.replace(/\s/g, '').length;
  const spaces = (hangulOnly.match(/\s/g) || []).length;
  const spaceRatio = hangulChars > 0 ? spaces / hangulChars : 0;

  let unformattedNumbers = 0;
  const withoutFormatted = sample.replace(FORMATTED_NUMBER, '');
  const plainMatches = withoutFormatted.match(/\d{4,}/g) || [];
  for (const token of plainMatches) {
    if (/^20[×xX]\d/.test(token)) continue;
    unformattedNumbers += 1;
  }

  return { longestGlued, spaceRatio, unformattedNumbers };
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
    cleaned.table = cleanDisplayText(question.table, {
      field: 'table',
      preserveParagraphs: true,
    });
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
