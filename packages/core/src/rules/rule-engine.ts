import type { FinancialEvent } from '@shared';

export interface Rule {
  id: string;
  name: string;
  when: Partial<Record<keyof FinancialEvent, string | string[]>>;
  assign: Partial<FinancialEvent>;
}

export const defaultRules: Rule[] = [
  {
    id: 'rule-market',
    name: 'Mercado e supermercado',
    when: { description: ['mercado', 'supermercado', 'rede pas', 'emporio'] },
    assign: { group: 'Alimentação', category: 'Supermercado' }
  },
  {
    id: 'rule-fuel',
    name: 'Combustível',
    when: { description: ['posto', 'combustivel', 'combustível'] },
    assign: { group: 'Transporte', category: 'Combustível' }
  },
  {
    id: 'rule-card',
    name: 'Cartão de crédito',
    when: { paymentMethod: ['cartão', 'credito', 'crédito', 'verocard', 'nubank'] },
    assign: { paymentMethod: 'Cartão de crédito' }
  }
];

export function matchesRule(event: FinancialEvent, rule: Rule): boolean {
  return Object.entries(rule.when).every(([field, expected]) => {
    const value = String(event[field as keyof FinancialEvent] || '').toLowerCase();

    if (Array.isArray(expected)) {
      return expected.some((item) => value.includes(String(item).toLowerCase()));
    }

    return value.includes(String(expected).toLowerCase());
  });
}

export function applyRules(event: FinancialEvent, rules: Rule[] = defaultRules): FinancialEvent {
  return rules.reduce((current, rule) => {
    if (!matchesRule(current, rule)) return current;
    return { ...current, ...rule.assign };
  }, event);
}
