// Shared helpers for PenguWave.

import DOMPurify from "dompurify";

/**
 * Sanitize a string before rendering it as HTML.
 * Strips dangerous markup (scripts, event handlers, javascript: URLs, etc.)
 * so attacker-controlled values can be safely shown to the user.
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input);
}

/**
 * Escape a single CSV field.
 *
 * Defends against two problems:
 *  1. Delimiter/quote/newline breakage — every value is wrapped in double
 *     quotes and any internal quote is doubled ("").
 *  2. CSV formula injection — if a value begins with a character a spreadsheet
 *     treats as a formula (=, +, -, @), we prepend a single quote so Excel /
 *     Google Sheets render it as literal text instead of evaluating it.
 */
function escapeCsvField(value: unknown): string {
  let str = String(value ?? "");
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Serialize a list of records to CSV for export.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((r) => headers.map((h) => escapeCsvField(r[h])).join(","));
  return [headers.map(escapeCsvField).join(","), ...lines].join("\n");
}
