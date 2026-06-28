export interface PaymentMethodProps {
  id?: string;
  name: string;
  type?: string;
  isActive?: boolean;
}

export class PaymentMethod {
  constructor(public readonly props: PaymentMethodProps) {
    if (!props.name.trim()) {
      throw new Error('Nome da forma de pagamento obrigatório.');
    }
  }
}
