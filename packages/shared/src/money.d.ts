export interface BRLInputOptions {
  allowNegative?: boolean;
}

export interface BRLDigitsOptions {
  negative?: boolean;
}

export function normalizeMoneyDigits(value: unknown): string;
export function digitsToBRL(digits: unknown, options?: BRLDigitsOptions): string;
export function parseBRL(value: unknown): number;
export function formatBRLValue(value: unknown): string;
export function formatBRLInput(value: unknown, options?: BRLInputOptions): string;
export function formatPastedBRL(value: unknown, options?: BRLInputOptions): string;
export function brlToCanonical(value: unknown): string;
