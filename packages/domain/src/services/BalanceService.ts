import { FinancialEvent } from '../entities/FinancialEvent';

export class BalanceService {
  static calculate(events: FinancialEvent[]) {
    return events.reduce((sum, event) => sum + event.signedAmount, 0);
  }

  static income(events: FinancialEvent[]) {
    return events
      .filter((event) => event.signedAmount > 0)
      .reduce((sum, event) => sum + event.signedAmount, 0);
  }

  static expense(events: FinancialEvent[]) {
    return events
      .filter((event) => event.signedAmount < 0)
      .reduce((sum, event) => sum + Math.abs(event.signedAmount), 0);
  }
}
