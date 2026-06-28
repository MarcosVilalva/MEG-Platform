export class Competence {
  private constructor(public readonly value: string) {}

  static fromDate(date: string | Date) {
    const iso = date instanceof Date ? date.toISOString() : date;
    return Competence.of(iso.slice(0, 7));
  }

  static of(value: string) {
    if (!/^\d{4}-\d{2}$/.test(value)) {
      throw new Error('Competência inválida. Use YYYY-MM.');
    }

    return new Competence(value);
  }
}
