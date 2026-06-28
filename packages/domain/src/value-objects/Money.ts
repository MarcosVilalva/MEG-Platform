export class Money {
  private constructor(public readonly value: number) {}

  static of(value: number) {
    if (!Number.isFinite(value)) {
      throw new Error('Valor monetário inválido.');
    }

    return new Money(Number(value.toFixed(2)));
  }

  static zero() {
    return new Money(0);
  }

  add(other: Money) {
    return Money.of(this.value + other.value);
  }

  subtract(other: Money) {
    return Money.of(this.value - other.value);
  }

  abs() {
    return Money.of(Math.abs(this.value));
  }

  negative() {
    return Money.of(-Math.abs(this.value));
  }

  positive() {
    return Money.of(Math.abs(this.value));
  }

  isPositive() {
    return this.value > 0;
  }

  isNegative() {
    return this.value < 0;
  }
}
