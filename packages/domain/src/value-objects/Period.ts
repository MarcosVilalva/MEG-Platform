import { Competence } from './Competence';

export class Period {
  private constructor(
    public readonly start: string,
    public readonly end: string
  ) {}

  static month(competence: string) {
    const parsed = Competence.of(competence).value;
    const [year, month] = parsed.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    return new Period(`${parsed}-01`, `${parsed}-${String(lastDay).padStart(2, '0')}`);
  }

  contains(date: string) {
    return date >= this.start && date <= this.end;
  }
}
