import { FinancialEvent } from '../entities/FinancialEvent';
import { LedgerEntry } from '../entities/LedgerEntry';

export class LedgerService {
  static createEntries(event: FinancialEvent): LedgerEntry[] {
    const accountId = event.props.accountId;
    const categoryId = event.props.categoryId;

    if (!accountId || !categoryId) {
      return [];
    }

    const amount = Math.abs(event.signedAmount);

    if (event.signedAmount >= 0) {
      return [
        new LedgerEntry({
          eventId: event.props.id || 'pending',
          date: event.props.date,
          accountId,
          debit: amount,
          credit: 0,
          memo: event.props.description
        }),
        new LedgerEntry({
          eventId: event.props.id || 'pending',
          date: event.props.date,
          accountId: categoryId,
          debit: 0,
          credit: amount,
          memo: event.props.description
        })
      ];
    }

    return [
      new LedgerEntry({
        eventId: event.props.id || 'pending',
        date: event.props.date,
        accountId: categoryId,
        debit: amount,
        credit: 0,
        memo: event.props.description
      }),
      new LedgerEntry({
        eventId: event.props.id || 'pending',
        date: event.props.date,
        accountId,
        debit: 0,
        credit: amount,
        memo: event.props.description
      })
    ];
  }

  static isBalanced(entries: LedgerEntry[]) {
    const debit = entries.reduce((sum, entry) => sum + entry.props.debit, 0);
    const credit = entries.reduce((sum, entry) => sum + entry.props.credit, 0);

    return Math.round((debit - credit) * 100) === 0;
  }
}
