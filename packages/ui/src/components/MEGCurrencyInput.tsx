import type { ClipboardEvent, InputHTMLAttributes, KeyboardEvent } from 'react';
import { formatBRLInput, formatPastedBRL } from '@shared/money';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'inputMode'> & {
  value: string;
  onValueChange: (value: string) => void;
  allowNegative?: boolean;
};

export function MEGCurrencyInput({
  value,
  onValueChange,
  allowNegative = false,
  autoComplete,
  onPaste,
  onKeyDown,
  ...props
}: Props) {
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    onPaste?.(event);
    if (event.defaultPrevented) return;
    const pasted = event.clipboardData.getData('text');
    if (!pasted) return;
    event.preventDefault();
    onValueChange(formatPastedBRL(pasted, { allowNegative }));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || !allowNegative || event.key !== '-') return;
    event.preventDefault();
    if (!value || value === '-') {
      onValueChange(value === '-' ? '' : '-');
      return;
    }
    onValueChange(value.startsWith('-') ? value.slice(1) : `-${value}`);
  }

  return (
    <input
      {...props}
      type="text"
      inputMode={allowNegative ? 'decimal' : 'numeric'}
      autoComplete={autoComplete ?? 'off'}
      data-meg-currency="true"
      value={value}
      onChange={(event) => onValueChange(formatBRLInput(event.target.value, { allowNegative }))}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
    />
  );
}
